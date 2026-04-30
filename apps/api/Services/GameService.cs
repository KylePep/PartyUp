using PartyUp.Api.Models;
using PartyUp.Api.Infrastructure.Clients;

namespace PartyUp.Api.Services;

public class GameService : IGameService
{
  private readonly RawgClient _rawg;

  public GameService(RawgClient rawg)
  {
    _rawg = rawg;
  }

  public async Task<List<Game>> SearchGames(string q, int page, List<int>? genres, List<string>? tags)
  {
    var rawgGames = await _rawg.GetGames(q, page, genres, tags);

    return rawgGames.Select(g => new Game
    {
      ExternalId = g.Id,
      Name = g.Name,
      ImageUrl = g.Background_Image
    }).ToList();
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

      Platforms = rawgGame.Platforms
            .Select(p => p.Platform.Name)
            .ToList()
    };
  }
}