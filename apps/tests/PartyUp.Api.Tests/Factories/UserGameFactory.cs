using PartyUp.Api.Models;

public static class UserGameFactory
{
  public static UserGame Create(User user, Game game)
  {
    return new UserGame
    {
      Id = Guid.NewGuid(),
      UserId = user.Id,
      GameId = game.Id
    };
  }
}
