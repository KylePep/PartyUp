using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Tests.Seeders;

public class DemoSeeder
{
    private static readonly Random Rng = new(1337);
    private const string DemoEmail = "demo@partyup.test";
    private const string DemoPassword = "Demo1234!";

    public async Task Seed(AppDbContext db)
    {
        var demoUser = await CreateDemoUser(db);
        if (demoUser == null) return;

        foreach (var config in GameConfigs())
        {
            Console.WriteLine($"  Seeding {config.Name} ({config.OtherUserCount} players, {config.MatchCount} matches)...");
            await SeedGame(db, demoUser, config);
        }

        Console.WriteLine();
        Console.WriteLine("=================================");
        Console.WriteLine($"  Email:    {DemoEmail}");
        Console.WriteLine($"  Password: {DemoPassword}");
        Console.WriteLine("=================================");
    }

    private static async Task<User?> CreateDemoUser(AppDbContext db)
    {
        var exists = await db.Users.AnyAsync(u => u.Email == DemoEmail);
        if (exists)
        {
            Console.WriteLine($"{DemoEmail} already exists — wipe the DB and re-run to reset.");
            return null;
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = DemoEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(DemoPassword)
        };

        db.Users.Add(user);
        db.UserProfiles.Add(new UserProfile { Id = Guid.NewGuid(), UserId = user.Id, DisplayName = "Demo Player" });
        await db.SaveChangesAsync();

        Console.WriteLine($"Created demo user: {DemoEmail}");
        return user;
    }

    private async Task SeedGame(AppDbContext db, User demoUser, GameConfig config)
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            ExternalId = config.ExternalId,
            Name = config.Name,
            Description = config.Description,
            Rating = config.Rating,
            Platforms = [.. config.Platforms],
            SchemaStatus = SchemaStatus.Generated
        };
        db.Games.Add(game);
        await db.SaveChangesAsync();

        var fields = config.CreateFields(game.Id);
        db.GameFieldDefinitions.AddRange(fields);
        await db.SaveChangesAsync();

        // Demo user's character in this game
        var demoUg = new UserGame { Id = Guid.NewGuid(), UserId = demoUser.Id, GameId = game.Id, Game = game };
        var demoChar = new Character
        {
            Id = Guid.NewGuid(),
            UserGameId = demoUg.Id,
            Platform = "PC",
            PlatformHandle = "DemoPlayer",
            Name = config.DemoCharName,
            Bio = config.DemoCharBio,
            CreatedAt = DateTime.UtcNow.AddDays(-30)
        };

        db.UserGames.Add(demoUg);
        db.Characters.Add(demoChar);
        await db.SaveChangesAsync();

        db.CharacterFieldValues.AddRange(RandomFieldValues(demoChar.Id, fields));
        await db.SaveChangesAsync();

        // Other users and their characters
        var otherChars = new List<Character>();
        var otherUsers = new List<User>();
        var otherUserGames = new List<UserGame>();
        var otherFieldValues = new List<CharacterFieldValue>();

        for (var i = 1; i <= config.OtherUserCount; i++)
        {
            var u = new User
            {
                Id = Guid.NewGuid(),
                Email = $"{config.Slug}_{i:D3}@example.com",
                PasswordHash = "seeded-hash"
            };
            var ug = new UserGame { Id = Guid.NewGuid(), UserId = u.Id, GameId = game.Id, Game = game };
            var c = new Character
            {
                Id = Guid.NewGuid(),
                UserGameId = ug.Id,
                Platform = PickPlatform(),
                PlatformHandle = $"{config.Slug}_{i:D3}",
                Name = $"{config.CharNamePrefix} {i}",
                Bio = $"Experienced {config.Name} player #{i}.",
                CreatedAt = DateTime.UtcNow.AddDays(-Rng.Next(1, 365))
            };

            otherUsers.Add(u);
            otherUserGames.Add(ug);
            otherChars.Add(c);
            otherFieldValues.AddRange(RandomFieldValues(c.Id, fields));
        }

        db.Users.AddRange(otherUsers);
        db.UserGames.AddRange(otherUserGames);
        db.Characters.AddRange(otherChars);
        await db.SaveChangesAsync();

        db.CharacterFieldValues.AddRange(otherFieldValues);
        await db.SaveChangesAsync();

        // Interactions and matches — walk through otherChars in order
        var interactions = new List<CharacterInteraction>();
        var matches = new List<CharacterMatch>();
        var cursor = 0;

        // Slot 1: mutual matches (both liked each other)
        for (; cursor < config.MatchCount && cursor < otherChars.Count; cursor++)
        {
            var other = otherChars[cursor];
            var matchedAt = DateTime.UtcNow.AddDays(-Rng.Next(1, 60));
            interactions.Add(MakeLike(demoChar.Id, other.Id, matchedAt.AddMinutes(-10)));
            interactions.Add(MakeLike(other.Id, demoChar.Id, matchedAt));
            var (a, b) = Order(demoChar.Id, other.Id);
            matches.Add(new CharacterMatch { Id = Guid.NewGuid(), CharacterAId = a, CharacterBId = b, MatchedAt = matchedAt });
        }

        // Slot 2: others who liked demo but demo hasn't responded (pending likes queue)
        for (var j = 0; j < config.PendingLikesFromOthers && cursor < otherChars.Count; j++, cursor++)
            interactions.Add(MakeLike(otherChars[cursor].Id, demoChar.Id, DateTime.UtcNow.AddDays(-Rng.Next(1, 7))));

        // Slot 3: demo liked a few with no mutual (demo's unrequited swipes)
        for (var j = 0; j < 3 && cursor < otherChars.Count; j++, cursor++)
            interactions.Add(MakeLike(demoChar.Id, otherChars[cursor].Id, DateTime.UtcNow.AddDays(-Rng.Next(1, 14))));

        // Remaining otherChars are untouched — pure discovery queue for demo

        db.CharacterInteractions.AddRange(interactions);
        db.CharacterMatches.AddRange(matches);
        await db.SaveChangesAsync();
    }

    private static CharacterInteraction MakeLike(Guid from, Guid to, DateTime at) => new()
    {
        Id = Guid.NewGuid(),
        FromCharacterId = from,
        ToCharacterId = to,
        Type = InteractionType.Like,
        CreatedAt = at
    };

    private static (Guid, Guid) Order(Guid a, Guid b) => a.CompareTo(b) < 0 ? (a, b) : (b, a);

    private static List<CharacterFieldValue> RandomFieldValues(Guid charId, List<GameFieldDefinition> fields) =>
        fields.Select(f => new CharacterFieldValue
        {
            Id = Guid.NewGuid(),
            CharacterId = charId,
            FieldDefinitionId = f.Id,
            Value = f.Options.Count > 0 ? f.Options[Rng.Next(f.Options.Count)] : "N/A"
        }).ToList();

    private static string PickPlatform() => new[] { "PC", "PlayStation", "Xbox" }[Rng.Next(3)];

    private static IEnumerable<GameConfig> GameConfigs() =>
    [
        // Discovery game: big queue, no matches yet
        new(
            Name: "Elder Scrolls Online", Slug: "eso", ExternalId: 888001,
            Description: "A massive online RPG set in the Elder Scrolls universe.",
            Rating: 4.2, Platforms: ["PC", "PlayStation", "Xbox"],
            CreateFields: HardcodedSchemas.ForEso,
            DemoCharName: "Aelindra Nightwhisper", CharNamePrefix: "ESO Hero",
            DemoCharBio: "Veteran ESO player, love PvE endgame content.",
            OtherUserCount: 45, MatchCount: 0, PendingLikesFromOthers: 5
        ),
        // Match-heavy games
        new(
            Name: "Valorant", Slug: "valorant", ExternalId: 888002,
            Description: "A tactical 5v5 character-based shooter.",
            Rating: 4.5, Platforms: ["PC"],
            CreateFields: HardcodedSchemas.ForValiant,
            DemoCharName: "VortexAim", CharNamePrefix: "Valiant Agent",
            DemoCharBio: "Diamond duelist main, looking for a serious 5-stack.",
            OtherUserCount: 22, MatchCount: 15, PendingLikesFromOthers: 2
        ),
        new(
            Name: "World of Warcraft", Slug: "wow", ExternalId: 888003,
            Description: "The legendary MMORPG that defined the genre.",
            Rating: 4.4, Platforms: ["PC"],
            CreateFields: HardcodedSchemas.ForWow,
            DemoCharName: "Kazrindael", CharNamePrefix: "WoW Hero",
            DemoCharBio: "Mythic+ pusher and avid raider, 3100+ IO.",
            OtherUserCount: 20, MatchCount: 12, PendingLikesFromOthers: 2
        ),
        new(
            Name: "Destiny 2", Slug: "destiny2", ExternalId: 888004,
            Description: "A shared-world shooter with RPG elements.",
            Rating: 4.1, Platforms: ["PC", "PlayStation", "Xbox"],
            CreateFields: HardcodedSchemas.ForDestiny2,
            DemoCharName: "NovaBlade", CharNamePrefix: "Guardian",
            DemoCharBio: "Day-one raider and Trials grinder.",
            OtherUserCount: 18, MatchCount: 10, PendingLikesFromOthers: 2
        ),
        new(
            Name: "Apex Legends", Slug: "apex", ExternalId: 888005,
            Description: "A free-to-play battle royale hero shooter.",
            Rating: 4.3, Platforms: ["PC", "PlayStation", "Xbox"],
            CreateFields: HardcodedSchemas.ForApex,
            DemoCharName: "PhantomStrike", CharNamePrefix: "Apex Legend",
            DemoCharBio: "Masters ranked Wraith main, IGL experience.",
            OtherUserCount: 16, MatchCount: 8, PendingLikesFromOthers: 2
        ),
        // Mid-tier games
        new(
            Name: "Final Fantasy XIV", Slug: "ffxiv", ExternalId: 888006,
            Description: "A critically acclaimed MMORPG with a rich story.",
            Rating: 4.8, Platforms: ["PC", "PlayStation"],
            CreateFields: HardcodedSchemas.ForFfxiv,
            DemoCharName: "Lyria Solwind", CharNamePrefix: "Warrior of Light",
            DemoCharBio: "Savage raider and housing enthusiast.",
            OtherUserCount: 14, MatchCount: 6, PendingLikesFromOthers: 1
        ),
        new(
            Name: "Guild Wars 2", Slug: "gw2", ExternalId: 888007,
            Description: "An action MMORPG with no subscription fee.",
            Rating: 4.0, Platforms: ["PC"],
            CreateFields: HardcodedSchemas.ForGuildWars2,
            DemoCharName: "Thornveil", CharNamePrefix: "Commander",
            DemoCharBio: "WvW commander and fractal enjoyer.",
            OtherUserCount: 12, MatchCount: 5, PendingLikesFromOthers: 1
        ),
        new(
            Name: "Minecraft", Slug: "minecraft", ExternalId: 888008,
            Description: "The iconic sandbox building and survival game.",
            Rating: 4.6, Platforms: ["PC", "PlayStation", "Xbox"],
            CreateFields: HardcodedSchemas.ForMinecraft,
            DemoCharName: "Blocksworth", CharNamePrefix: "Minecrafter",
            DemoCharBio: "Survival builder and redstone engineer.",
            OtherUserCount: 10, MatchCount: 4, PendingLikesFromOthers: 1
        ),
        // Lighter games
        new(
            Name: "Sea of Thieves", Slug: "sot", ExternalId: 888009,
            Description: "A shared-world pirate adventure game.",
            Rating: 4.0, Platforms: ["PC", "Xbox"],
            CreateFields: HardcodedSchemas.ForSeaOfThieves,
            DemoCharName: "Iron Barnacle", CharNamePrefix: "Pirate",
            DemoCharBio: "Pirate Legend, veteran Hourglass PvPer.",
            OtherUserCount: 8, MatchCount: 4, PendingLikesFromOthers: 1
        ),
        new(
            Name: "Lost Ark", Slug: "lostark", ExternalId: 888010,
            Description: "A massive online action RPG.",
            Rating: 3.9, Platforms: ["PC"],
            CreateFields: HardcodedSchemas.ForLostArk,
            DemoCharName: "Dawnstriker", CharNamePrefix: "Adventurer",
            DemoCharBio: "1600+ ilvl main, dedicated legion raider.",
            OtherUserCount: 7, MatchCount: 3, PendingLikesFromOthers: 1
        ),
        new(
            Name: "Path of Exile", Slug: "poe", ExternalId: 888011,
            Description: "A free-to-play action RPG with deep build complexity.",
            Rating: 4.2, Platforms: ["PC"],
            CreateFields: HardcodedSchemas.ForPathOfExile,
            DemoCharName: "ChaosWeaver", CharNamePrefix: "Exile",
            DemoCharBio: "Softcore enjoyer, always min-maxing the meta.",
            OtherUserCount: 5, MatchCount: 2, PendingLikesFromOthers: 0
        ),
        new(
            Name: "Diablo IV", Slug: "d4", ExternalId: 888012,
            Description: "Action RPG set in the dark world of Sanctuary.",
            Rating: 3.8, Platforms: ["PC", "PlayStation", "Xbox"],
            CreateFields: HardcodedSchemas.ForDiablo4,
            DemoCharName: "ShadowReaper", CharNamePrefix: "Nephalem",
            DemoCharBio: "Pushing Pit 120+ on a barb main.",
            OtherUserCount: 4, MatchCount: 1, PendingLikesFromOthers: 0
        ),
    ];
}

record GameConfig(
    string Name,
    string Slug,
    int ExternalId,
    string Description,
    double Rating,
    string[] Platforms,
    Func<Guid, List<GameFieldDefinition>> CreateFields,
    string DemoCharName,
    string CharNamePrefix,
    string DemoCharBio,
    int OtherUserCount,
    int MatchCount,
    int PendingLikesFromOthers
);
