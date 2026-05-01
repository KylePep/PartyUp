using PartyUp.Api.Infrastructure.Data;

public class TestDataSeeder
{
  public async Task SeedSetA(AppDbContext db)
  {
    var user = UserFactory.Create();
    var game1 = GameFactory.Create();
    var game2 = GameFactory.Create();

    var ug1 = UserGameFactory.Create(user, game1);
    var ug2 = UserGameFactory.Create(user, game2);

    var char1 = CharacterFactory.Create(ug1, "Warrior");
    var char2 = CharacterFactory.Create(ug1, "Mage");
    var char3 = CharacterFactory.Create(ug2, "Rogue");

    db.Users.Add(user);
    db.Games.AddRange(game1, game2);
    db.UserGames.AddRange(ug1, ug2);
    db.Characters.AddRange(char1, char2, char3);

    await db.SaveChangesAsync();
  }

  public async Task SeedSetB(AppDbContext db)
  {
    var user1 = UserFactory.Create();
    var user2 = UserFactory.Create();

    var sharedGame = GameFactory.Create();

    var ug1 = UserGameFactory.Create(user1, sharedGame);
    var ug2 = UserGameFactory.Create(user2, sharedGame);

    var char1 = CharacterFactory.Create(ug1, "Knight");
    var char2 = CharacterFactory.Create(ug2, "Assassin");

    db.AddRange(user1, user2, sharedGame, ug1, ug2, char1, char2);

    await db.SaveChangesAsync();
  }

}
