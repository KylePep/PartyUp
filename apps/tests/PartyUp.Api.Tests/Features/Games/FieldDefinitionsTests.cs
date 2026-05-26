using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Games;

public class FieldDefinitionsTests : TestBase, IClassFixture<ApiFactory>
{
    public FieldDefinitionsTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetFieldDefinitions_Returns404_WhenGameDoesNotExist()
    {
        var authClient = await CreateAuthenticatedClientAsync();
        var response = await authClient.GetAsync($"/api/games/{Guid.NewGuid()}/field-definitions");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetFieldDefinitions_ReturnsStatusAndFields_WhenGameHasDefinitions()
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            ExternalId = 77777,
            Name = "Elder Scrolls Online",
            SchemaStatus = SchemaStatus.Generated
        };
        var fieldA = new GameFieldDefinition
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            Key = "alliance",
            Label = "Alliance",
            Type = FieldType.Select,
            Options = ["Aldmeri", "Daggerfall", "Ebonheart"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = 1
        };
        var fieldB = new GameFieldDefinition
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            Key = "server",
            Label = "Server",
            Type = FieldType.Select,
            Options = ["NA", "EU"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = 2
        };

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Games.Add(game);
            db.GameFieldDefinitions.AddRange(fieldA, fieldB);
            await db.SaveChangesAsync();
        }

        var authClient = await CreateAuthenticatedClientAsync();
        var response = await authClient.GetAsync($"/api/games/{game.Id}/field-definitions");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<FieldDefinitionsResponse>();
        body!.SchemaStatus.Should().Be("Generated");
        body.Fields.Should().HaveCount(2);
        body.Fields[0].Key.Should().Be("alliance");
        body.Fields[1].Key.Should().Be("server");
    }

    [Fact]
    public async Task GetFieldDefinitions_ReturnsPendingStatus_WhenNoDefinitionsYet()
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            ExternalId = 66666,
            Name = "New Game",
            SchemaStatus = SchemaStatus.Pending
        };

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Games.Add(game);
            await db.SaveChangesAsync();
        }

        var authClient = await CreateAuthenticatedClientAsync();
        var response = await authClient.GetAsync($"/api/games/{game.Id}/field-definitions");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<FieldDefinitionsResponse>();
        body!.SchemaStatus.Should().Be("Pending");
        body.Fields.Should().BeEmpty();
    }

    private record FieldDefinitionsResponse(string SchemaStatus, List<FieldDto> Fields);
    private record FieldDto(string Key, string Label, string Type, List<string> Options, bool IsFilterable, bool IsRequired, int SortOrder);
}
