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
