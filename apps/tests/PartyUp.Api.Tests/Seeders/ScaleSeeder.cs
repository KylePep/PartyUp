using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;

namespace PartyUp.Api.Tests.Seeders;

public class ScaleSeeder
{
    private static readonly Random Rng = new(42);

    public async Task SeedEso(AppDbContext db, int userCount = 50)
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            ExternalId = 999001,
            Name = "Elder Scrolls Online",
            Description = "A massive online RPG set in the Elder Scrolls universe.",
            Rating = 4.2,
            Platforms = ["PC", "PlayStation", "Xbox"],
            SchemaStatus = SchemaStatus.Generated
        };

        db.Games.Add(game);
        await db.SaveChangesAsync();

        var fields = HardcodedSchemas.ForEso(game.Id);
        db.GameFieldDefinitions.AddRange(fields);
        await db.SaveChangesAsync();

        var allianceField = fields.First(f => f.Key == "alliance");
        var serverField = fields.First(f => f.Key == "server");
        var cpField = fields.First(f => f.Key == "cpLevel");
        var roleField = fields.First(f => f.Key == "role");

        var users = new List<User>();
        var characters = new List<Character>();
        var fieldValues = new List<CharacterFieldValue>();

        for (var i = 1; i <= userCount; i++)
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = $"player_{i:D3}",
                PasswordHash = "seeded-hash"
            };
            users.Add(user);

            var userGame = new UserGame
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                GameId = game.Id,
                Game = game
            };

            var character = new Character
            {
                Id = Guid.NewGuid(),
                UserGameId = userGame.Id,
                Platform = Pick("PC", "PlayStation", "Xbox"),
                PlatformHandle = $"ESO_Player_{i:D3}",
                Name = $"Character_{i:D3}",
                Bio = $"Veteran ESO player #{i}.",
                Playstyle = Pick("Casual", "Competitive", "Hardcore"),
                PreferredModes = [Pick("PvE", "PvP", "Trials", "Dungeons")]
            };

            fieldValues.AddRange([
                new CharacterFieldValue { CharacterId = character.Id, FieldDefinitionId = allianceField.Id, Value = PickFrom(allianceField.Options) },
                new CharacterFieldValue { CharacterId = character.Id, FieldDefinitionId = serverField.Id, Value = PickFrom(serverField.Options) },
                new CharacterFieldValue { CharacterId = character.Id, FieldDefinitionId = cpField.Id, Value = PickFrom(cpField.Options) },
                new CharacterFieldValue { CharacterId = character.Id, FieldDefinitionId = roleField.Id, Value = PickFrom(roleField.Options) },
            ]);

            characters.Add(character);

            db.Users.Add(user);
            db.UserGames.Add(userGame);
        }

        db.Characters.AddRange(characters);
        await db.SaveChangesAsync();

        db.CharacterFieldValues.AddRange(fieldValues);
        await db.SaveChangesAsync();

        // Seed random interactions so the discovery queue isn't blank for seeded users
        var charIds = characters.Select(c => c.Id).ToList();
        var interactions = new List<CharacterInteraction>();
        for (var i = 0; i < Math.Min(200, userCount * 3); i++)
        {
            var from = charIds[Rng.Next(charIds.Count)];
            var to = charIds[Rng.Next(charIds.Count)];
            if (from == to) continue;
            if (interactions.Any(x => x.FromCharacterId == from && x.ToCharacterId == to)) continue;

            interactions.Add(new CharacterInteraction
            {
                Id = Guid.NewGuid(),
                FromCharacterId = from,
                ToCharacterId = to,
                Type = Rng.Next(2) == 0 ? InteractionType.Like : InteractionType.Dislike,
                CreatedAt = DateTime.UtcNow.AddMinutes(-Rng.Next(1440))
            });
        }

        db.CharacterInteractions.AddRange(interactions);
        await db.SaveChangesAsync();

        Console.WriteLine($"Seeded {userCount} users with ESO characters and {interactions.Count} interactions.");
    }

    private static T Pick<T>(params T[] options) => options[Rng.Next(options.Length)];
    private static string PickFrom(IReadOnlyList<string> options) => options[Rng.Next(options.Count)];
}
