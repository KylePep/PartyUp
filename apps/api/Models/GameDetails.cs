using System.Text.Json.Serialization;

namespace PartyUp.Api.Models;

public class GameDetails
{
  public int ExternalId { get; set; }

  public string Name { get; set; } = string.Empty;

  [JsonPropertyName("description")]
  public string Description { get; set; } = string.Empty;


  public string? ImageUrl { get; set; }

  public string? Website { get; set; }

  public double Rating { get; set; }

  public List<string> Platforms { get; set; } = [];
}
