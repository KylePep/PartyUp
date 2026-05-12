namespace PartyUp.Api.Models.DTOs.Game;

public class PagedGamesResult
{
  public List<GameSimple> Games { get; set; } = new();
  public int TotalCount { get; set; }
  public int Page { get; set; }
  public int TotalPages { get; set; }
}
