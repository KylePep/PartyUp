namespace PartyUp.Api.Models;

public class Character
{
  public Guid Id { get; set; }
  public Guid UserGameId { get; set; }
  public UserGame UserGame { get; set; } = default!;

  public string Name { get; set; } = default!;
  public string? Nickname { get; set; }
  public string? Bio { get; set; }
  public string? Playstyle { get; set; }
  public string? Rank { get; set; }
  public string? Region { get; set; }

  public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
