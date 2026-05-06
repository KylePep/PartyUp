using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Models;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.CharacterInteractions;

public class CharacterInteractionTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 20_000;

    public CharacterInteractionTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Like_WithNoMutualLike_IsMatchFalse()
    {
        var (charA, charB, clientA, _) = await SetupTwoUsersWithCharactersAsync();

        var response = await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = InteractionType.Like
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<MatchDto>();
        result!.IsMatch.Should().BeFalse();
    }

    [Fact]
    public async Task Like_WithMutualLike_IsMatchTrue()
    {
        var (charA, charB, clientA, clientB) = await SetupTwoUsersWithCharactersAsync();

        await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = InteractionType.Like
        });

        var response = await clientB.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charB,
            toCharacterId = charA,
            type = InteractionType.Like
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<MatchDto>();
        result!.IsMatch.Should().BeTrue();
        result.MatchId.Should().NotBeNull();
    }

    [Fact]
    public async Task Dislike_IsMatchFalse()
    {
        var (charA, charB, clientA, _) = await SetupTwoUsersWithCharactersAsync();

        var response = await clientA.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = charA,
            toCharacterId = charB,
            type = InteractionType.Dislike
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<MatchDto>();
        result!.IsMatch.Should().BeFalse();
    }

    [Fact]
    public async Task RecordInteraction_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync("/api/character-interactions", new
        {
            fromCharacterId = Guid.NewGuid(),
            toCharacterId = Guid.NewGuid(),
            type = InteractionType.Like
        });

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
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterDto>())!.Id;
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
        return (await response.Content.ReadFromJsonAsync<UserGameDto>())!;
    }

    private record UserGameDto(Guid Id, Guid GameId);
    private record CharacterDto(Guid Id);
    private record MatchDto(bool IsMatch, Guid? MatchId);
}
