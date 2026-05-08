namespace PartyUp.Api.Models;

public class Game
{
  public Guid Id { get; set; }
  public int ExternalId { get; set; }
  public string Name { get; set; } = string.Empty;
  public string? ImageUrl { get; set; }
  public string? Description { get; set; }
  public string? Website { get; set; }
  public double Rating { get; set; }
  public List<string> Platforms { get; set; } = [];
}
