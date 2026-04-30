namespace PartyUp.Api.Contracts.Rawg;

public class RawgGameDetailed
{
  public int Id { get; set; }

  public string Slug { get; set; } = string.Empty;

  public string Name { get; set; } = string.Empty;

  public string Name_Original { get; set; } = string.Empty;

  public string Description { get; set; } = string.Empty;

  public int? Metacritic { get; set; }

  public DateOnly? Released { get; set; }

  public bool Tba { get; set; }

  public DateTime? Updated { get; set; }

  public string? Background_Image { get; set; }

  public string? Background_Image_Additional { get; set; }

  public string? Website { get; set; }

  public double Rating { get; set; }

  public int Rating_Top { get; set; }

  public int Ratings_Count { get; set; }

  public int Suggestions_Count { get; set; }

  public int Playtime { get; set; }

  public int Screenshots_Count { get; set; }

  public int Movies_Count { get; set; }

  public int Achievements_Count { get; set; }

  public string? Reddit_Url { get; set; }

  public string? Reddit_Name { get; set; }

  public string? Reddit_Description { get; set; }

  public string? Reddit_Logo { get; set; }

  public int Reddit_Count { get; set; }

  public int? Twitch_Count { get; set; }

  public int? Youtube_Count { get; set; }

  public int? Reviews_Text_Count { get; set; }

  public string? Metacritic_Url { get; set; }

  public List<string> Alternative_Names { get; set; } = [];

  public EsrbRating? Esrb_Rating { get; set; }

  public List<RawgPlatformWrapper> Platforms { get; set; } = [];
}

public class EsrbRating
{
  public int Id { get; set; }

  public string Slug { get; set; } = string.Empty;

  public string Name { get; set; } = string.Empty;
}

public class RawgPlatformWrapper
{
  public RawgPlatform Platform { get; set; } = null!;

  public string? Released_At { get; set; }

  public RawgRequirements? Requirements { get; set; }
}

public class RawgPlatform
{
  public int Id { get; set; }

  public string Slug { get; set; } = string.Empty;

  public string Name { get; set; } = string.Empty;
}

public class RawgRequirements
{
  public string? Minimum { get; set; }

  public string? Recommended { get; set; }
}

