using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Games;

public class GameDetailsTests : TestBase, IClassFixture<ApiFactory>
{
  public GameDetailsTests(ApiFactory factory) : base(factory) { }

  [Fact]
  public async Task GetByDbId_ReturnsGameDetails_WhenGameExistsWithDetails()
  {
    var game = new Game
    {
      Id = Guid.NewGuid(),
      ExternalId = 88888,
      Name = "Test Game",
      ImageUrl = null,
      Description = "An epic adventure game.",
      Website = "https://example.com",
      Rating = 4.5,
      Platforms = ["PC", "Xbox"]
    };

    using (var scope = Factory.Services.CreateScope())
    {
      var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
      db.Games.Add(game);
      await db.SaveChangesAsync();
    }

    var response = await Client.GetAsync($"/api/games/{game.Id}");

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    var details = await response.Content.ReadFromJsonAsync<GameDetailsDto>();
    details!.Name.Should().Be("Test Game");
    details.Description.Should().Be("An epic adventure game.");
    details.Platforms.Should().BeEquivalentTo(["PC", "Xbox"]);
    details.Rating.Should().Be(4.5);
  }

  [Fact]
  public async Task GetByDbId_Returns404_WhenGameDoesNotExist()
  {
    var response = await Client.GetAsync($"/api/games/{Guid.NewGuid()}");
    response.StatusCode.Should().Be(HttpStatusCode.NotFound);
  }

  private record GameDetailsDto(
    int ExternalId,
    string Name,
    string Description,
    string? ImageUrl,
    string? Website,
    double Rating,
    List<string> Platforms);
}
