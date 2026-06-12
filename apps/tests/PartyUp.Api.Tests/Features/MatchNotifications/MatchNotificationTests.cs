using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Models;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.MatchNotifications;

public class MatchNotificationTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 50_000;

    public MatchNotificationTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task PostViewed_MarksMatchAsNotNew()
    {
        var (_, _, clientA, clientB) = await SetupMutualMatchAsync();

        var matchesBeforeA = await (await clientA.GetAsync("/api/character-matches"))
            .Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
        matchesBeforeA!.Items[0].IsNew.Should().BeTrue();

        var matchId = matchesBeforeA.Items[0].MatchId;
        var viewedResponse = await clientA.PostAsync($"/api/match-notifications/{matchId}/viewed", null);
        viewedResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var matchesAfterA = await (await clientA.GetAsync("/api/character-matches"))
            .Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
        matchesAfterA!.Items[0].IsNew.Should().BeFalse();

        var matchesB = await (await clientB.GetAsync("/api/character-matches"))
            .Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
        matchesB!.Items[0].IsNew.Should().BeTrue();
    }

    [Fact]
    public async Task PostViewed_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsync($"/api/match-notifications/{Guid.NewGuid()}/viewed", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<(Guid CharA, Guid CharB, HttpClient ClientA, HttpClient ClientB)>
        SetupMutualMatchAsync()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var sharedId = Interlocked.Increment(ref _gameCounter);

        var ugA = await AddGameAsync(clientA, sharedId);
        var ugB = await AddGameAsync(clientB, sharedId);
        var charA = await CreateCharacterAsync(clientA, ugA);
        var charB = await CreateCharacterAsync(clientB, ugB);

        await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = InteractionType.Like
        });
        await clientB.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charB,
            toCharacterId = charA,
            type = InteractionType.Like
        });

        return (charA, charB, clientA, clientB);
    }

    private async Task<Guid> AddGameAsync(HttpClient client, int externalId)
    {
        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AddGameResult>())!.UserGame.Id;
    }

    private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId)
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Tester",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterIdDto>())!.Id;
    }

    private record PagedResultDto<T>(List<T> Items, int TotalCount, int Page, int PageSize);
    private record AddGameResult(UserGameDto UserGame, bool Redirected, string? Message);
    private record UserGameDto(Guid Id, Guid GameId);
    private record CharacterIdDto(Guid Id);
    private record MatchItemDto(Guid MatchId, DateTime MatchedAt, bool IsNew);
}
