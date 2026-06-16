using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.CharacterInteractions;

public class PendingLikesTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 30_000;

    public PendingLikesTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetPendingLikes_WhenOtherUserLikedMe_ReturnsTheirCharacter()
    {
        var (charA, charB, clientA, clientB) = await SetupTwoUsersWithCharactersAsync();

        // charA likes charB
        await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = InteractionType.Like
        });

        // charB queries pending likes — should see charA
        var response = await clientB.GetAsync($"/api/character-interactions/pending?characterId={charB}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pending = await response.Content.ReadFromJsonAsync<List<PendingCharacterDto>>();
        pending.Should().HaveCount(1);
        pending![0].Id.Should().Be(charA);
    }

    [Fact]
    public async Task GetPendingLikes_WhenIAlreadyRespondedWithLike_ReturnsEmpty()
    {
        var (charA, charB, clientA, clientB) = await SetupTwoUsersWithCharactersAsync();

        await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = InteractionType.Like
        });

        // charB responds — mutual match
        await clientB.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charB,
            toCharacterId = charA,
            type = InteractionType.Like
        });

        var response = await clientB.GetAsync($"/api/character-interactions/pending?characterId={charB}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var pending = await response.Content.ReadFromJsonAsync<List<PendingCharacterDto>>();
        pending.Should().BeEmpty();
    }

    [Fact]
    public async Task GetPendingLikes_WhenIAlreadyRespondedWithDislike_ReturnsEmpty()
    {
        var (charA, charB, clientA, clientB) = await SetupTwoUsersWithCharactersAsync();

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
            type = InteractionType.Dislike
        });

        var response = await clientB.GetAsync($"/api/character-interactions/pending?characterId={charB}");
        var pending = await response.Content.ReadFromJsonAsync<List<PendingCharacterDto>>();
        pending.Should().BeEmpty();
    }

    [Fact]
    public async Task GetPendingLikes_WithAnotherUsersCharacterId_ReturnsForbidden()
    {
        var (charA, _, _, clientB) = await SetupTwoUsersWithCharactersAsync();

        // clientB tries to query pending likes for charA (which belongs to clientA)
        var response = await clientB.GetAsync($"/api/character-interactions/pending?characterId={charA}");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetPendingLikes_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync($"/api/character-interactions/pending?characterId={Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<(Guid CharA, Guid CharB, HttpClient ClientA, HttpClient ClientB)>
        SetupTwoUsersWithCharactersAsync()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var sharedExternalId = Interlocked.Increment(ref _gameCounter);
        var ugA = await AddGameAsync(clientA, sharedExternalId);
        var ugB = await AddGameAsync(clientB, sharedExternalId);

        var charA = await CreateCharacterAsync(clientA, ugA.Id);
        var charB = await CreateCharacterAsync(clientB, ugB.Id);

        return (charA, charB, clientA, clientB);
    }

    private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId)
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Character",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterIdDto>())!.Id;
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

    private record UserGameDto(Guid Id, Guid GameId);
    private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
    private record CharacterIdDto(Guid Id);
    private record PendingCharacterDto(Guid Id, string Name);
}
