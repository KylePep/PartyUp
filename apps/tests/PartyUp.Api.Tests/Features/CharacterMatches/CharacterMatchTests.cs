using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.CharacterMatches;

public class CharacterMatchTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 30_000;

    public CharacterMatchTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetMatches_WithMutualLike_ReturnsMatch()
    {
        var (charA, charB, clientA, _, gameId) = await SetupMutualMatchAsync();

        var response = await clientA.GetAsync("/api/character-matches");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
        result!.Items.Should().HaveCount(1);
        result.Items[0].MyCharacter.Id.Should().Be(charA);
        result.Items[0].TheirCharacter.Id.Should().Be(charB);
        result.Items[0].GameId.Should().Be(gameId);
        result.Items[0].GameName.Should().NotBeNullOrEmpty();
        result.Items[0].MatchedAt.Should().NotBe(default);
    }

    [Fact]
    public async Task GetMatches_WithGameIdFilter_ReturnsMatchForThatGame()
    {
        var (_, _, clientA, _, gameId) = await SetupMutualMatchAsync();

        var response = await clientA.GetAsync($"/api/character-matches?gameId={gameId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
        result!.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetMatches_WithWrongGameIdFilter_ReturnsEmpty()
    {
        var (_, _, clientA, _, _) = await SetupMutualMatchAsync();

        var response = await clientA.GetAsync($"/api/character-matches?gameId={Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
        result!.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMatches_WithNoMatches_ReturnsEmpty()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/character-matches");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
        result!.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMatches_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/character-matches");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMatches_Pagination_ReturnsTotalCountAndPage()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        // Create 3 mutual matches across 3 separate games
        for (int i = 0; i < 3; i++)
        {
            var externalId = Interlocked.Increment(ref _gameCounter);
            var ugA = await AddGameAsync(clientA, externalId);
            var ugB = await AddGameAsync(clientB, externalId);
            var charA = await CreateCharacterAsync(clientA, ugA.Id);
            var charB = await CreateCharacterAsync(clientB, ugB.Id);
            await MutualLikeAsync(clientA, charA, clientB, charB);
        }

        var page1Response = await clientA.GetAsync("/api/character-matches?page=1&pageSize=2");
        page1Response.StatusCode.Should().Be(HttpStatusCode.OK);

        var page1 = await page1Response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
        page1!.TotalCount.Should().Be(3);
        page1.Items.Should().HaveCount(2);
        page1.Page.Should().Be(1);
        page1.PageSize.Should().Be(2);

        var page2Response = await clientA.GetAsync("/api/character-matches?page=2&pageSize=2");
        var page2 = await page2Response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();
        page2!.Items.Should().HaveCount(1);
        page2.TotalCount.Should().Be(3);
    }

    [Fact]
    public async Task GetMatches_OrderedByGameNameAsc()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        // FakeRawgHandler returns "Game {id}" as the name — use IDs whose names
        // sort alphabetically in a known order.
        // extIdEarly is in the 3xxxx range ("Game 3xxxx"), extIdLate adds 50000
        // to put it in the 8xxxx range ("Game 8xxxx"), which sorts after "Game 3xxxx".
        var extIdEarly = Interlocked.Increment(ref _gameCounter);
        var extIdLate = extIdEarly + 50000;

        // Create the "late" match FIRST (reversed order) to prove sort is by name, not insertion
        var ugALate = await AddGameAsync(clientA, extIdLate);
        var ugBLate = await AddGameAsync(clientB, extIdLate);
        var charALate = await CreateCharacterAsync(clientA, ugALate.Id);
        var charBLate = await CreateCharacterAsync(clientB, ugBLate.Id);
        await MutualLikeAsync(clientA, charALate, clientB, charBLate);

        // Create the "early" match SECOND
        var ugAEarly = await AddGameAsync(clientA, extIdEarly);
        var ugBEarly = await AddGameAsync(clientB, extIdEarly);
        var charAEarly = await CreateCharacterAsync(clientA, ugAEarly.Id);
        var charBEarly = await CreateCharacterAsync(clientB, ugBEarly.Id);
        await MutualLikeAsync(clientA, charAEarly, clientB, charBEarly);

        var response = await clientA.GetAsync("/api/character-matches");
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();

        result!.Items.Should().HaveCount(2);
        result.Items[0].GameName.Should().Be($"Game {extIdEarly}");
        result.Items[1].GameName.Should().Be($"Game {extIdLate}");
    }

    [Fact]
    public async Task GetMatches_WithSearchFilter_ReturnsByTheirCharacterName()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var extId = Interlocked.Increment(ref _gameCounter);
        var ugA = await AddGameAsync(clientA, extId);
        var ugB = await AddGameAsync(clientB, extId);
        var charA = await CreateCharacterAsync(clientA, ugA.Id);
        var charB = await CreateCharacterAsync(clientB, ugB.Id, name: "Swordmaster");
        await MutualLikeAsync(clientA, charA, clientB, charB);

        var response = await clientA.GetAsync("/api/character-matches?search=sword");
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();

        result!.Items.Should().HaveCount(1);
        result.Items[0].TheirCharacter.Id.Should().Be(charB);
    }

    [Fact]
    public async Task GetMatches_WithSearchFilter_IsCaseInsensitive()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var extId = Interlocked.Increment(ref _gameCounter);
        var ugA = await AddGameAsync(clientA, extId);
        var ugB = await AddGameAsync(clientB, extId);
        var charA = await CreateCharacterAsync(clientA, ugA.Id);
        var charB = await CreateCharacterAsync(clientB, ugB.Id, name: "Swordmaster");
        await MutualLikeAsync(clientA, charA, clientB, charB);

        var response = await clientA.GetAsync("/api/character-matches?search=SWORD");
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();

        result!.Items.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetMatches_WithSearchFilter_NoMatch_ReturnsEmpty()
    {
        var (_, _, clientA, _, _) = await SetupMutualMatchAsync();

        var response = await clientA.GetAsync("/api/character-matches?search=xyznomatch999");
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<MatchItemDto>>();

        result!.Items.Should().BeEmpty();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<(Guid CharA, Guid CharB, HttpClient ClientA, HttpClient ClientB, Guid GameId)>
        SetupMutualMatchAsync()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var sharedExternalId = Interlocked.Increment(ref _gameCounter);
        var ugA = await AddGameAsync(clientA, sharedExternalId);
        var ugB = await AddGameAsync(clientB, sharedExternalId);

        var charA = await CreateCharacterAsync(clientA, ugA.Id);
        var charB = await CreateCharacterAsync(clientB, ugB.Id);
        await MutualLikeAsync(clientA, charA, clientB, charB);

        return (charA, charB, clientA, clientB, ugA.GameId);
    }

    private async Task MutualLikeAsync(HttpClient clientA, Guid charA, HttpClient clientB, Guid charB)
    {
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
    }

    private async Task<UserGameDto> AddGameAsync(HttpClient client, int externalId)
    {
        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AddGameResultDto>())!.UserGame;
    }

    private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId, string name = "TestCharacter")
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name,
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterIdDto>())!.Id;
    }

    private record PagedResultDto<T>(List<T> Items, int TotalCount, int Page, int PageSize);
    private record UserGameDto(Guid Id, Guid GameId);
    private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
    private record CharacterIdDto(Guid Id);
    private record CharacterSummaryDto(Guid Id, string Name);
    private record MatchItemDto(Guid MatchId, DateTime MatchedAt, CharacterSummaryDto MyCharacter, CharacterSummaryDto TheirCharacter, Guid GameId, string GameName);
}
