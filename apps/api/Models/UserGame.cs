namespace PartyUp.Api.Models;

public class UserGame
{
  public Guid Id { get; set; }

  public Guid UserId { get; set; }
  public Guid GameId { get; set; }

  public DateTime CreatedAt { get; set; }

  public Game Game { get; set; } = null!;
}