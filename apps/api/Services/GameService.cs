using PartyUp.Api.Models;
using PartyUp.Api.Infrastructure.Clients;

namespace PartyUp.Api.Services;

public class GameService : IGameService
{
  private readonly RawgClient _rawg;
  private const int PageSize = 20;

  public GameService(RawgClient rawg)
  {
    _rawg = rawg;
  }

  public async Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, List<string>? tags)
  {
    var response = await _rawg.GetGames(q, page, genres, tags);

    var games = response.Results.Select(g => new Game
    {
      ExternalId = g.Id,
      Name = g.Name,
      ImageUrl = g.Background_Image
    }).ToList();

    return new PagedGamesResult
    {
      Games = games,
      TotalCount = response.Count,
      Page = page,
      TotalPages = response.Count == 0 ? 1 : (int)Math.Ceiling(response.Count / (double)PageSize)
    };
  }

  public async Task<GameDetails?> GetGameById(int id)
  {
    var rawgGame = await _rawg.GetGameById(id);

    if (rawgGame == null)
      return null;

    return new GameDetails
    {
      ExternalId = rawgGame.Id,
      Name = rawgGame.Name,
      Description = rawgGame.Description,
      ImageUrl = rawgGame.Background_Image,
      Website = rawgGame.Website,
      Rating = rawgGame.Rating,
      Platforms = rawgGame.Platforms.Select(p => p.Platform.Name).ToList()
    };
  }
}
