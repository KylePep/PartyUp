namespace PartyUp.Api.Models;

public class PagedGamesResult
{
  public List<Game> Games { get; set; } = new();
  public int TotalCount { get; set; }
  public int Page { get; set; }
  public int TotalPages { get; set; }
}
