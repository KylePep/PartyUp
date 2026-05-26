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

public class CharacterFieldValueTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _externalIdCounter = 40_000;

    public CharacterFieldValueTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task CreateCharacter_SavesGameFields_WhenFieldDefinitionsExist()
    {
        var client = await CreateAuthenticatedClientAsync();
        var externalId = Interlocked.Increment(ref _externalIdCounter);

        var addGameResponse = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        addGameResponse.EnsureSuccessStatusCode();
        var userGame = await addGameResponse.Content.ReadFromJsonAsync<UserGameDto>();

        // Manually seed field definitions for that game
        Guid allianceFieldId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var game = await db.Games.FindAsync(userGame!.GameId);
            game!.SchemaStatus = SchemaStatus.Generated;

            var field = new GameFieldDefinition
            {
                Id = Guid.NewGuid(),
                GameId = userGame.GameId,
                Key = "alliance",
                Label = "Alliance",
                Type = FieldType.Select,
                Options = ["Aldmeri", "Daggerfall", "Ebonheart"],
                IsFilterable = true,
                IsRequired = true,
                SortOrder = 1
            };
            allianceFieldId = field.Id;
            db.GameFieldDefinitions.Add(field);
            await db.SaveChangesAsync();
        }

        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "My ESO Character",
            platform = "PC",
            platformHandle = "EsoPlayer",
            userGameId = userGame!.Id,
            gameFields = new[]
            {
                new { fieldDefinitionId = allianceFieldId, value = "Aldmeri" }
            }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var character = await response.Content.ReadFromJsonAsync<CharacterResponseDto>();

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var saved = db.CharacterFieldValues
                .Where(cfv => cfv.CharacterId == character!.Id)
                .ToList();
            saved.Should().ContainSingle();
            saved[0].FieldDefinitionId.Should().Be(allianceFieldId);
            saved[0].Value.Should().Be("Aldmeri");
        }
    }

    [Fact]
    public async Task CreateCharacter_Succeeds_WithNoGameFields()
    {
        var client = await CreateAuthenticatedClientAsync();
        var externalId = Interlocked.Increment(ref _externalIdCounter);

        var addGameResponse = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        addGameResponse.EnsureSuccessStatusCode();
        var userGame = await addGameResponse.Content.ReadFromJsonAsync<UserGameDto>();

        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Bare Character",
            platform = "PC",
            platformHandle = "BarePlayer",
            userGameId = userGame!.Id
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task GetMyCharacters_ReturnsGameFields_WhenFieldDefinitionsExist()
    {
        var client = await CreateAuthenticatedClientAsync();
        var externalId = Interlocked.Increment(ref _externalIdCounter);

        var addGameResponse = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        addGameResponse.EnsureSuccessStatusCode();
        var userGame = await addGameResponse.Content.ReadFromJsonAsync<UserGameDto>();

        Guid classFieldId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var game = await db.Games.FindAsync(userGame!.GameId);
            game!.SchemaStatus = SchemaStatus.Generated;

            var field = new GameFieldDefinition
            {
                Id = Guid.NewGuid(),
                GameId = userGame.GameId,
                Key = "class",
                Label = "Class",
                Type = FieldType.Select,
                Options = ["Warrior", "Mage", "Rogue"],
                IsFilterable = true,
                IsRequired = false,
                SortOrder = 1
            };
            classFieldId = field.Id;
            db.GameFieldDefinitions.Add(field);
            await db.SaveChangesAsync();
        }

        await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Field Test Character",
            platform = "PC",
            platformHandle = "FieldPlayer",
            userGameId = userGame!.Id,
            gameFields = new[]
            {
                new { fieldDefinitionId = classFieldId, value = "Mage" }
            }
        });

        var response = await client.GetAsync("/api/characters");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var characters = await response.Content.ReadFromJsonAsync<List<CharacterWithFieldsDto>>();
        var target = characters!.Single(c => c.Name == "Field Test Character");
        var gameField = target.GameFields.Should().ContainSingle().Subject;
        gameField.Key.Should().Be("class");
        gameField.Value.Should().Be("Mage");
        gameField.FieldDefinitionId.Should().Be(classFieldId);
    }

    private record UserGameDto(Guid Id, Guid GameId);
    private record CharacterResponseDto(Guid Id, string Name);
    private record GameFieldDto(Guid FieldDefinitionId, string Key, string Label, string Value, string Type);
    private record CharacterWithFieldsDto(Guid Id, string Name, List<GameFieldDto> GameFields);
}
