using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.UserGames;

public class UserGameTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 30_000;

    public UserGameTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task AddGame_ReturnsUserGame()
    {
        var client = await CreateAuthenticatedClientAsync();
        var id = Interlocked.Increment(ref _gameCounter);

        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var userGame = await response.Content.ReadFromJsonAsync<UserGameDto>();
        userGame!.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetUserGames_ReturnsOwnGames()
    {
        var client = await CreateAuthenticatedClientAsync();
        var id = Interlocked.Increment(ref _gameCounter);

        await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });

        var response = await client.GetAsync("/api/user-games");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var games = await response.Content.ReadFromJsonAsync<List<UserGameDto>>();
        games.Should().ContainSingle();
    }

    [Fact]
    public async Task DeleteUserGame_RemovesGame()
    {
        var client = await CreateAuthenticatedClientAsync();
        var id = Interlocked.Increment(ref _gameCounter);

        var addResponse = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });
        var userGame = (await addResponse.Content.ReadFromJsonAsync<UserGameDto>())!;

        var deleteResponse = await client.DeleteAsync($"/api/user-games/{userGame.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await client.GetAsync("/api/user-games");
        var games = await getResponse.Content.ReadFromJsonAsync<List<UserGameDto>>();
        games.Should().BeEmpty();
    }

    [Fact]
    public async Task AddGame_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = 1,
            name = "Test Game",
            imageUrl = (string?)null
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUserGames_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/user-games");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUserGames_DoesNotReturnOtherUsersGames()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var idA = Interlocked.Increment(ref _gameCounter);
        var idB = Interlocked.Increment(ref _gameCounter);

        await clientA.PostAsJsonAsync("/api/user-games", new
        {
            externalId = idA,
            name = $"Game {idA}",
            imageUrl = (string?)null
        });

        await clientB.PostAsJsonAsync("/api/user-games", new
        {
            externalId = idB,
            name = $"Game {idB}",
            imageUrl = (string?)null
        });

        var response = await clientA.GetAsync("/api/user-games");
        var games = await response.Content.ReadFromJsonAsync<List<UserGameDto>>();

        games.Should().ContainSingle();
    }

    private record UserGameDto(Guid Id, Guid UserId, Guid GameId, string GameName);
}
