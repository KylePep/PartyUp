namespace PartyUp.Api.Models;

public class Character
{
  public Guid Id { get; set; }
  public Guid UserGameId { get; set; }
  public UserGame UserGame { get; set; } = default;

  public string Name { get; set; } = default!;
  public string? Nickname { get; set; }
  public string? Description { get; set; }
  public string? PlayStyle { get; set; }

  public DateTime CreateAt { get; set; } = DateTime.UtcNow;

}
