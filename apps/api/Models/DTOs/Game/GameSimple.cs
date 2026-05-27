using System.Text.Json.Serialization;

namespace PartyUp.Api.Models.DTOs.Game;

public class GameSimple
{
  public int ExternalId { get; set; }
  public string Name { get; set; } = string.Empty;
  public string? ImageUrl { get; set; }
  public int PlayerCount { get; set; }
}
