using PartyUp.Api.Models;

public static class CharacterFactory
{
  public static Character Create(UserGame userGame, string name = null)
  {
    return new Character
    {
      Id = Guid.NewGuid(),
      Name = name ?? "Default Character",
      UserGameId = userGame.Id
    };
  }
}
