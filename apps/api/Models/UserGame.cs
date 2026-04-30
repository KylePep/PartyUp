namespace PartyUp.Api.Models;

public class UserGame
{
  public int Id { get; set; }

  public string UserId { get; set; } = string.Empty;
  public int GameId { get; set; }

  public Game Game { get; set; } = null!;
}