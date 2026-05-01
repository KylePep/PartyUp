using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Tests.Factories;

public class FactorySmokeTests : IClassFixture<ApiFactory>
{
  private readonly IServiceScopeFactory _scopeFactory;

  public FactorySmokeTests(ApiFactory factory)
  {
    _scopeFactory = factory.Services.GetRequiredService<IServiceScopeFactory>();
  }

  [Fact]
  public async Task Can_seed_user_game_graph()
  {
    using var scope = _scopeFactory.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var user = UserFactory.Create();
    var game = GameFactory.Create();
    var userGame = UserGameFactory.Create(user, game);
    var character = CharacterFactory.Create(userGame);

    db.Users.Add(user);
    db.Games.Add(game);
    db.UserGames.Add(userGame);
    db.Characters.Add(character);

    await db.SaveChangesAsync();

    var saved = await db.Users.FirstOrDefaultAsync(x => x.Id == user.Id);

    Assert.NotNull(saved);
  }
}
