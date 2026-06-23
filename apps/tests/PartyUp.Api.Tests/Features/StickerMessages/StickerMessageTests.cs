using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.StickerMessages;

public class StickerMessageTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 60_000;

    public StickerMessageTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task PostSticker_ReturnsDto()
    {
        var (matchId, clientA, _, charA, _) = await SetupMatchAsync();

        var response = await clientA.PostAsJsonAsync(
            $"/api/sticker-messages/{matchId}", new { emoji = "🏆" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<StickerDto>();
        dto!.Emoji.Should().Be("🏆");
        dto.MatchId.Should().Be(matchId);
        dto.SenderCharacterId.Should().Be(charA);
        dto.SentAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task GetStickers_ReturnsSentMessages()
    {
        var (matchId, clientA, clientB, charA, charB) = await SetupMatchAsync();

        await clientA.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "🎮" });
        await clientB.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "🏆" });

        var response = await clientA.GetAsync($"/api/sticker-messages/{matchId}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var messages = await response.Content.ReadFromJsonAsync<List<StickerDto>>();
        messages.Should().HaveCount(2);
        messages![0].Emoji.Should().Be("🎮");
        messages[0].SenderCharacterId.Should().Be(charA);
        messages[1].Emoji.Should().Be("🏆");
        messages[1].SenderCharacterId.Should().Be(charB);
    }

    [Fact]
    public async Task GetStickers_OrderedBySentAt()
    {
        var (matchId, clientA, clientB, _, _) = await SetupMatchAsync();

        await clientA.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "🎮" });
        await clientB.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "🏆" });
        await clientA.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "⭐" });

        var response = await clientA.GetAsync($"/api/sticker-messages/{matchId}");
        var messages = await response.Content.ReadFromJsonAsync<List<StickerDto>>();

        messages.Should().HaveCount(3);
        messages![0].Emoji.Should().Be("🎮");
        messages[1].Emoji.Should().Be("🏆");
        messages[2].Emoji.Should().Be("⭐");
    }

    [Fact]
    public async Task GetStickers_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync($"/api/sticker-messages/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PostSticker_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync(
            $"/api/sticker-messages/{Guid.NewGuid()}", new { emoji = "🎮" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetStickers_NonParticipant_Returns403()
    {
        var (matchId, _, _, _, _) = await SetupMatchAsync();
        var outsider = await CreateAuthenticatedClientAsync();

        var response = await outsider.GetAsync($"/api/sticker-messages/{matchId}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostSticker_NonParticipant_Returns403()
    {
        var (matchId, _, _, _, _) = await SetupMatchAsync();
        var outsider = await CreateAuthenticatedClientAsync();

        var response = await outsider.PostAsJsonAsync(
            $"/api/sticker-messages/{matchId}", new { emoji = "🎮" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostSticker_UnknownMatch_Returns404()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync(
            $"/api/sticker-messages/{Guid.NewGuid()}", new { emoji = "🎮" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private async Task<(Guid MatchId, HttpClient ClientA, HttpClient ClientB, Guid CharA, Guid CharB)>
        SetupMatchAsync()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var extId = Interlocked.Increment(ref _gameCounter);
        var ugA = await AddGameAsync(clientA, extId);
        var ugB = await AddGameAsync(clientB, extId);
        var charA = await CreateCharacterAsync(clientA, ugA.Id);
        var charB = await CreateCharacterAsync(clientB, ugB.Id);
        await MutualLikeAsync(clientA, charA, clientB, charB);

        var matchResponse = await clientA.GetAsync("/api/character-matches");
        var matches = await matchResponse.Content.ReadFromJsonAsync<PagedResultDto<MatchItem>>();
        var matchId = matches!.Items[0].MatchId;

        return (matchId, clientA, clientB, charA, charB);
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

    private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId)
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "TestCharacter",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterIdDto>())!.Id;
    }

    private record StickerDto(Guid Id, Guid MatchId, Guid SenderCharacterId, string Emoji, DateTime SentAt);
    private record PagedResultDto<T>(List<T> Items, int TotalCount, int Page, int PageSize);
    private record MatchItem(Guid MatchId);
    private record UserGameDto(Guid Id, Guid GameId);
    private record AddGameResultDto(UserGameDto UserGame);
    private record CharacterIdDto(Guid Id);
}
