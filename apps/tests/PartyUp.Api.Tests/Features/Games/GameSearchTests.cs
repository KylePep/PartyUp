using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Games;

public class GameSearchTests : TestBase, IClassFixture<ApiFactory>
{
    public GameSearchTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Search_ReturnsPlayerCountForGamesInDb()
    {
        var client = await CreateAuthenticatedClientAsync();

        // Enroll a user in game 91000 so it exists in the DB with 1 player
        await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = 91000,
            name = "Game 91000",
            imageUrl = (string?)null
        });

        // FakeRawgHandler returns game 91000 for search query "testgame"
        var response = await client.GetAsync("/api/games?q=testgame");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PagedGamesDto>();
        result!.Games.Should().ContainSingle();
        result.Games[0].ExternalId.Should().Be(91000);
        result.Games[0].PlayerCount.Should().Be(1);
    }

    [Fact]
    public async Task Search_ReturnsZeroPlayerCountForUnknownGames()
    {
        var client = await CreateAuthenticatedClientAsync();

        // FakeRawgHandler returns game 91000 for "testgame" — but no one has joined it
        var response = await client.GetAsync("/api/games?q=testgame");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PagedGamesDto>();
        result!.Games.Should().ContainSingle();
        result.Games[0].PlayerCount.Should().Be(0);
    }

    private record PagedGamesDto(List<GameDto> Games, int TotalCount, int Page, int TotalPages);
    private record GameDto(int ExternalId, string Name, string? ImageUrl, int PlayerCount);
}
