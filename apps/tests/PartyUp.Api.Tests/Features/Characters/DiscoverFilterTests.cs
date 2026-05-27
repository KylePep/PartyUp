using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Characters;

public class DiscoverFilterTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _externalIdCounter = 50_000;

    public DiscoverFilterTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Discover_WithFilter_ReturnsOnlyMatchingCharacters()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var clientC = await CreateAuthenticatedClientAsync(); // my user

        var externalId = Interlocked.Increment(ref _externalIdCounter);
        var userGameA = await AddGameAsync(clientA, externalId);
        var userGameB = await AddGameAsync(clientB, externalId);
        var userGameC = await AddGameAsync(clientC, externalId);
        var gameId = userGameC.GameId;

        // Seed a filterable field definition for the shared game
        Guid allianceFieldId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var field = new GameFieldDefinition
            {
                Id = Guid.NewGuid(),
                GameId = gameId,
                Key = "alliance",
                Label = "Alliance",
                Type = FieldType.Select,
                Options = ["Aldmeri", "Daggerfall"],
                IsFilterable = true,
                IsRequired = true,
                SortOrder = 1
            };
            allianceFieldId = field.Id;
            db.GameFieldDefinitions.Add(field);
            await db.SaveChangesAsync();
        }

        // User A picks Aldmeri
        var charAResponse = await clientA.PostAsJsonAsync("/api/characters", new
        {
            name = "Aldmeri Character",
            platform = "PC",
            platformHandle = "PlayerA",
            userGameId = userGameA.Id,
            gameFields = new[] { new { fieldDefinitionId = allianceFieldId, value = "Aldmeri" } }
        });
        charAResponse.EnsureSuccessStatusCode();

        // User B picks Daggerfall
        var charBResponse = await clientB.PostAsJsonAsync("/api/characters", new
        {
            name = "Daggerfall Character",
            platform = "PC",
            platformHandle = "PlayerB",
            userGameId = userGameB.Id,
            gameFields = new[] { new { fieldDefinitionId = allianceFieldId, value = "Daggerfall" } }
        });
        charBResponse.EnsureSuccessStatusCode();

        // User C must have a character to use discover
        (await clientC.PostAsJsonAsync("/api/characters", new
        {
            name = "My Character",
            platform = "PC",
            platformHandle = "PlayerC",
            userGameId = userGameC.Id
        })).EnsureSuccessStatusCode();

        // User C discovers with alliance=Aldmeri filter
        var response = await clientC.GetAsync($"/api/characters/discover?gameId={gameId}&alliance=Aldmeri");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var discovered = await response.Content.ReadFromJsonAsync<List<DiscoveredCharacterDto>>();
        discovered!.Should().ContainSingle(c => c.Name == "Aldmeri Character");
        discovered.Should().NotContain(c => c.Name == "Daggerfall Character");
    }

    [Fact]
    public async Task Discover_WithUnknownFilterKey_ReturnsAllCharacters()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var clientC = await CreateAuthenticatedClientAsync();

        var externalId = Interlocked.Increment(ref _externalIdCounter);
        var userGameA = await AddGameAsync(clientA, externalId);
        var userGameB = await AddGameAsync(clientB, externalId);
        var userGameC = await AddGameAsync(clientC, externalId);
        var gameId = userGameC.GameId;

        await clientA.PostAsJsonAsync("/api/characters", new
        {
            name = "Character A",
            platform = "PC",
            platformHandle = "PlayerA",
            userGameId = userGameA.Id
        });

        await clientB.PostAsJsonAsync("/api/characters", new
        {
            name = "Character B",
            platform = "PC",
            platformHandle = "PlayerB",
            userGameId = userGameB.Id
        });

        // User C must have a character to use discover
        (await clientC.PostAsJsonAsync("/api/characters", new
        {
            name = "Character C",
            platform = "PC",
            platformHandle = "PlayerC",
            userGameId = userGameC.Id
        })).EnsureSuccessStatusCode();

        // Unknown filter key should be ignored
        var response = await clientC.GetAsync($"/api/characters/discover?gameId={gameId}&nonExistentField=anything");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var discovered = await response.Content.ReadFromJsonAsync<List<DiscoveredCharacterDto>>();
        discovered!.Should().HaveCount(2);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

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
    private record DiscoveredCharacterDto(Guid Id, string Name);
}
