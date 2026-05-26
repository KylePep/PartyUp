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

        var characters = await response.Content.ReadFromJsonAsync<List<CharacterDto>>();
        characters.Should().ContainSingle(c => c.Name == "My Character");
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

        var discovered = await response.Content.ReadFromJsonAsync<List<DiscoveredDto>>();
        discovered.Should().ContainSingle(c => c.Name == "User B Character");
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

    private record UserGameDto(Guid Id, Guid UserId, Guid GameId, string GameName);
    private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
    private record CharacterDto(Guid Id, string Name, Guid UserGameId);
    private record DiscoveredDto(Guid Id, string Name);
}
