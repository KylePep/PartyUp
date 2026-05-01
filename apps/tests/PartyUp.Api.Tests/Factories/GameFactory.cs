using PartyUp.Api.Models;

public static class GameFactory
{
  private static int _counter = 1000;

  public static Game Create()
  {
    return new Game
    {
      Id = Guid.NewGuid(),
      ExternalId = _counter++,
      Name = $"Game {_counter}",
      ImageUrl = "string"
    };
  }
}
