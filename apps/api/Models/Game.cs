namespace PartyUp.Api.Models;

public class Game
{
  public int Id { get; set; }
  public int ExternalId { get; set; }

  public string Name { get; set; } = string.Empty;
  public string? ImageUrl { get; set; }
}