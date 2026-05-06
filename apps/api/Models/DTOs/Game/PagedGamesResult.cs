using Models = PartyUp.Api.Models;

namespace PartyUp.Api.Models.DTOs.Game;

public class PagedGamesResult
{
  public List<Models.Game> Games { get; set; } = new();
  public int TotalCount { get; set; }
  public int Page { get; set; }
  public int TotalPages { get; set; }
}
