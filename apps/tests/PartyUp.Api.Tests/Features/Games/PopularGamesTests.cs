using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Infrastructure;
using PartyUp.Api.Tests.Factories;

namespace PartyUp.Api.Tests.Features.Games;

public class PopularGamesTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 40_000;

    public PopularGamesTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Popular_IsPublic_Returns200WithoutAuth()
    {
        var response = await Client.GetAsync("/api/games/popular");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Popular_ReturnsGamesOrderedByUserGameCount()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var clientC = await CreateAuthenticatedClientAsync();
        var gameAId = Interlocked.Increment(ref _gameCounter);
        var gameBId = Interlocked.Increment(ref _gameCounter);

        // game A gets 2 users, game B gets 1
        await clientA.PostAsJsonAsync("/api/user-games", new { externalId = gameAId, name = $"Game {gameAId}", imageUrl = (string?)null });
        await clientB.PostAsJsonAsync("/api/user-games", new { externalId = gameAId, name = $"Game {gameAId}", imageUrl = (string?)null });
        await clientC.PostAsJsonAsync("/api/user-games", new { externalId = gameBId, name = $"Game {gameBId}", imageUrl = (string?)null });

        var response = await Client.GetAsync("/api/games/popular");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<List<PopularGameDto>>();
        result.Should().NotBeNull();
        result!.Should().HaveCount(2);
        result[0].UserGameCount.Should().Be(2);
        result[1].UserGameCount.Should().Be(1);
    }

    [Fact]
    public async Task Popular_LimitParam_CapsResults()
    {
        for (int i = 0; i < 8; i++)
        {
            var client = await CreateAuthenticatedClientAsync();
            var id = Interlocked.Increment(ref _gameCounter);
            await client.PostAsJsonAsync("/api/user-games", new { externalId = id, name = $"Game {id}", imageUrl = (string?)null });
        }

        var response = await Client.GetAsync("/api/games/popular?limit=6");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<List<PopularGameDto>>();
        result!.Count.Should().BeLessThanOrEqualTo(6);
    }

    private record PopularGameDto(Guid Id, int ExternalId, string Name, string? ImageUrl, int UserGameCount);
}
