using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Admin;

public class AdminGamesTests : TestBase, IClassFixture<ApiFactory>
{
    public AdminGamesTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetGames_AsAdmin_ReturnsAllGames()
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            ExternalId = 88001,
            Name = "Test Game",
            ImageUrl = "https://example.com/img.jpg",
            SchemaStatus = SchemaStatus.Failed
        };

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Games.Add(game);
            await db.SaveChangesAsync();
        }

        var client = await CreateAdminClientAsync();
        var response = await client.GetAsync("/api/admin/games");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<AdminGameDto>>();
        body.Should().NotBeNull();
        var entry = body!.First(g => g.Id == game.Id);
        entry.Name.Should().Be("Test Game");
        entry.SchemaStatus.Should().Be("Failed");
        entry.FieldDefinitionCount.Should().Be(0);
    }

    [Fact]
    public async Task GetGames_AsAdmin_ReturnsFieldDefinitionCount()
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            ExternalId = 88002,
            Name = "Game With Fields",
            SchemaStatus = SchemaStatus.Generated
        };
        var field = new GameFieldDefinition
        {
            Id = Guid.NewGuid(),
            GameId = game.Id,
            Key = "role",
            Label = "Role",
            Type = FieldType.Select,
            Options = ["Tank", "Healer", "DPS"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = 1
        };

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Games.Add(game);
            db.GameFieldDefinitions.Add(field);
            await db.SaveChangesAsync();
        }

        var client = await CreateAdminClientAsync();
        var response = await client.GetAsync("/api/admin/games");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<AdminGameDto>>();
        var entry = body!.First(g => g.Id == game.Id);
        entry.FieldDefinitionCount.Should().Be(1);
    }

    [Fact]
    public async Task RegenerateSchema_AsAdmin_Returns202()
    {
        var game = new Game
        {
            Id = Guid.NewGuid(),
            ExternalId = 88003,
            Name = "Failed Game",
            SchemaStatus = SchemaStatus.Failed
        };

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Games.Add(game);
            await db.SaveChangesAsync();
        }

        var client = await CreateAdminClientAsync();
        var response = await client.PostAsync($"/api/admin/games/{game.Id}/regenerate-schema", null);

        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
    }

    [Fact]
    public async Task RegenerateSchema_AsAdmin_Returns404_WhenGameNotFound()
    {
        var client = await CreateAdminClientAsync();
        var response = await client.PostAsync($"/api/admin/games/{Guid.NewGuid()}/regenerate-schema", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private record AdminGameDto(Guid Id, string Name, string? ImageUrl, string SchemaStatus, int FieldDefinitionCount);
}
