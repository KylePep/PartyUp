namespace PartyUp.Api.Models.DTOs.Rawg;

public class RawgGameDetailed
{
  public int Id { get; set; }
  public string Name { get; set; } = string.Empty;
  public string Description { get; set; } = string.Empty;
  public string? Background_Image { get; set; }
  public string? Website { get; set; }
  public double Rating { get; set; }
  public List<RawgPlatformWrapper> Platforms { get; set; } = [];

  /// <summary>
  /// Number of parent games (>0 means this game is a DLC/expansion).
  /// Populated by RAWG in the game-detail response; actual parent details
  /// require a separate call to /api/games/{id}/parent-games.
  /// </summary>
  public int ParentsCount { get; set; }
}

public class RawgPlatformWrapper
{
  public RawgPlatform Platform { get; set; } = null!;
}

public class RawgPlatform
{
  public int Id { get; set; }
  public string Slug { get; set; } = string.Empty;
  public string Name { get; set; } = string.Empty;
}
