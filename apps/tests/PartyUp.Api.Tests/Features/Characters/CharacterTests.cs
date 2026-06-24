using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Characters;

public class CharacterTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 10_000;

    public CharacterTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task CreateCharacter_ReturnsCreated()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Test Character",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId = userGame.Id
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task GetMyCharacters_ReturnsCharacters()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        await client.PostAsJsonAsync("/api/characters", new
        {
            name = "My Character",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId = userGame.Id
        });

        var response = await client.GetAsync("/api/characters");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<CharacterDto>>();
        result!.Items.Should().ContainSingle(c => c.Name == "My Character");
    }

    [Fact]
    public async Task Discover_ReturnsOtherUsersCharactersForSameGame()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        // Both users add the same external game — UserGameService reuses the same Game record
        var sharedExternalId = Interlocked.Increment(ref _gameCounter);
        var userGameA = await AddGameAsync(clientA, sharedExternalId);
        var userGameB = await AddGameAsync(clientB, sharedExternalId);

        await clientA.PostAsJsonAsync("/api/characters", new
        {
            name = "User A Character",
            platform = "PC",
            platformHandle = "TestHandleA",
            userGameId = userGameA.Id
        });

        await clientB.PostAsJsonAsync("/api/characters", new
        {
            name = "User B Character",
            platform = "PC",
            platformHandle = "TestHandleB",
            userGameId = userGameB.Id
        });

        var response = await clientA.GetAsync($"/api/characters/discover?gameId={userGameA.GameId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var paged = await response.Content.ReadFromJsonAsync<PagedDiscoverDto>();
        paged!.Items.Should().ContainSingle(c => c.Name == "User B Character");
    }

    [Fact]
    public async Task Discover_WithPagination_ReturnsPagedResult()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var clientC = await CreateAuthenticatedClientAsync();

        var sharedExternalId = Interlocked.Increment(ref _gameCounter);
        var userGameA = await AddGameAsync(clientA, sharedExternalId);
        var userGameB = await AddGameAsync(clientB, sharedExternalId);
        var userGameC = await AddGameAsync(clientC, sharedExternalId);

        // User A must have a character to be allowed to discover
        await clientA.PostAsJsonAsync("/api/characters", new
        {
            name = "User A Character",
            platform = "PC",
            platformHandle = "HandleA",
            userGameId = userGameA.Id
        });

        await clientB.PostAsJsonAsync("/api/characters", new
        {
            name = "User B Character",
            platform = "PC",
            platformHandle = "HandleB",
            userGameId = userGameB.Id
        });

        await clientC.PostAsJsonAsync("/api/characters", new
        {
            name = "User C Character",
            platform = "PC",
            platformHandle = "HandleC",
            userGameId = userGameC.Id
        });

        var response = await clientA.GetAsync(
            $"/api/characters/discover?gameId={userGameA.GameId}&page=1&pageSize=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PagedDiscoverDto>();
        result!.Items.Should().HaveCount(1);
        result.HasMore.Should().BeTrue();
        result.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task CreateCharacter_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync("/api/characters", new
        {
            name = "Test",
            userGameId = Guid.NewGuid()
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMyCharacters_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/characters");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateCharacter_OnAnotherUsersGame_ReturnsNotFound()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var userGameB = await AddGameAsync(clientB);

        // User A tries to create a character using User B's UserGame ID
        var response = await clientA.PostAsJsonAsync("/api/characters", new
        {
            name = "Sneaky Character",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId = userGameB.Id
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }


    [Fact]
    public async Task GetMyCharacters_ReturnsGameName()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Game Name Test",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId = userGame.Id
        });

        var response = await client.GetAsync("/api/characters");
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<CharacterWithGameDto>>();
        result!.Items.Should().ContainSingle(c => c.GameName == userGame.GameName);
    }

    [Fact]
    public async Task CreateCharacter_WithAdditionalNotes_RoundtripsValue()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Notes Character",
            platform = "PC",
            platformHandle = "NotesHandle",
            userGameId = userGame.Id,
            additionalNotes = "Looking for a chill group, play evenings EST."
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterWithNotesDto>>("/api/characters");
        all!.Items.Should().ContainSingle(c =>
            c.Name == "Notes Character" &&
            c.AdditionalNotes == "Looking for a chill group, play evenings EST.");
    }

    [Fact]
    public async Task GetMyCharacters_Pagination_ReturnsTotalCountAndPage()
    {
        var client = await CreateAuthenticatedClientAsync();

        // Create 3 characters (user cap) across 3 separate games
        for (int i = 0; i < 3; i++)
        {
            var game = await AddGameAsync(client);
            await client.PostAsJsonAsync("/api/characters", new
            {
                name = $"Paged Character {i}",
                platform = "PC",
                platformHandle = $"Handle{i}",
                userGameId = game.Id
            });
        }

        var page1Response = await client.GetAsync("/api/characters?page=1&pageSize=2");
        page1Response.StatusCode.Should().Be(HttpStatusCode.OK);

        var page1 = await page1Response.Content.ReadFromJsonAsync<PagedResultDto<CharacterDto>>();
        page1!.TotalCount.Should().Be(3);
        page1.Items.Should().HaveCount(2);
        page1.Page.Should().Be(1);
        page1.PageSize.Should().Be(2);

        var page2Response = await client.GetAsync("/api/characters?page=2&pageSize=2");
        var page2 = await page2Response.Content.ReadFromJsonAsync<PagedResultDto<CharacterDto>>();
        page2!.Items.Should().HaveCount(1);
        page2.TotalCount.Should().Be(3);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<UserGameDto> AddGameAsync(HttpClient client, int? externalId = null)
    {
        var id = externalId ?? Interlocked.Increment(ref _gameCounter);
        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AddGameResultDto>())!.UserGame;
    }

    [Fact]
    public async Task GetCharacters_AfterMutualMatch_HasNewMatchTrue()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var externalId = Interlocked.Increment(ref _gameCounter);

        var ugA = await AddGameAsync(clientA, externalId);
        var ugB = await AddGameAsync(clientB, externalId);

        var charARes = await clientA.PostAsJsonAsync("/api/characters", new
        {
            name = "CharA",
            platform = "PC",
            platformHandle = "HandleA",
            userGameId = ugA.Id
        });
        var charA = (await charARes.Content.ReadFromJsonAsync<CharacterDto>())!.Id;

        var charBRes = await clientB.PostAsJsonAsync("/api/characters", new
        {
            name = "CharB",
            platform = "PC",
            platformHandle = "HandleB",
            userGameId = ugB.Id
        });
        var charB = (await charBRes.Content.ReadFromJsonAsync<CharacterDto>())!.Id;

        await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = "Like"
        });
        await clientB.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charB,
            toCharacterId = charA,
            type = "Like"
        });

        var result = await (await clientA.GetAsync("/api/characters"))
            .Content.ReadFromJsonAsync<PagedResultDto<CharWithFlagDto>>();
        result!.Items.Should().ContainSingle(c => c.Id == charA && c.HasNewMatch);
    }

    [Fact]
    public async Task CreateCharacter_WithCardBackgroundColor_RoundtripsValue()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Color Character",
            platform = "PC",
            platformHandle = "ColorHandle",
            userGameId = userGame.Id,
            cardBackgroundColor = "#1a1a2e"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterWithColorDto>>("/api/characters");
        all!.Items.Should().ContainSingle(c =>
            c.Name == "Color Character" &&
            c.CardBackgroundColor == "#1a1a2e");
    }

    [Fact]
    public async Task UpdateCharacter_WithCardBackgroundColor_PersistsChange()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var charResponse = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Color Char",
            platform = "PC",
            platformHandle = "ColorHandle2",
            userGameId = userGame.Id
        });
        var character = (await charResponse.Content.ReadFromJsonAsync<CharacterDto>())!;

        await client.PutAsJsonAsync(
            $"/api/characters/{userGame.Id}/{character.Id}",
            new { name = "Color Char", cardBackgroundColor = "#1b4332" });

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterWithColorDto>>("/api/characters");
        all!.Items.Should().ContainSingle(c =>
            c.Name == "Color Char" &&
            c.CardBackgroundColor == "#1b4332");
    }

    [Fact]
    public async Task Discover_ReturnsCardBackgroundColor()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var sharedExternalId = Interlocked.Increment(ref _gameCounter);
        var userGameA = await AddGameAsync(clientA, sharedExternalId);
        var userGameB = await AddGameAsync(clientB, sharedExternalId);

        await clientA.PostAsJsonAsync("/api/characters", new
        {
            name = "Discoverer",
            platform = "PC",
            platformHandle = "DiscovererHandle",
            userGameId = userGameA.Id
        });

        await clientB.PostAsJsonAsync("/api/characters", new
        {
            name = "Colorful",
            platform = "PC",
            platformHandle = "ColorfulHandle",
            userGameId = userGameB.Id,
            cardBackgroundColor = "#3d0a14"
        });

        var response = await clientA.GetAsync($"/api/characters/discover?gameId={userGameA.GameId}");
        var paged = await response.Content.ReadFromJsonAsync<PagedDiscoverWithColorDto>();
        paged!.Items.Should().ContainSingle(c =>
            c.Name == "Colorful" &&
            c.CardBackgroundColor == "#3d0a14");
    }

    private record UserGameDto(Guid Id, Guid UserId, Guid GameId, string GameName);
    private record AddGameResultDto(UserGameDto UserGame);
    private record CharacterDto(Guid Id, string Name, Guid UserGameId);
    private record DiscoveredDto(Guid Id, string Name);
    private record CharacterWithGameDto(Guid Id, string Name, string? GameName);
    private record CharacterWithNotesDto(Guid Id, string Name, string? AdditionalNotes);
    private record PagedResultDto<T>(List<T> Items, int TotalCount, int Page, int PageSize);
    private record PagedDiscoverDto(List<DiscoveredDto> Items, bool HasMore, int TotalCount);
    private record CharWithFlagDto(Guid Id, bool HasNewMatch);
    private record CharacterWithColorDto(Guid Id, string Name, string? CardBackgroundColor);
    private record DiscoveredWithColorDto(string Name, string? CardBackgroundColor);
    private record PagedDiscoverWithColorDto(List<DiscoveredWithColorDto> Items, bool HasMore, int TotalCount);
}
