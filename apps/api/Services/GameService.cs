using PartyUp.Api.Domain.Models;
using PartyUp.Api.Domain.Models.Rawg;
using PartyUp.Api.Infrastructure.Clients;

namespace PartyUp.Api.Services;

public class GameService : IGameService
{
  private readonly RawgClient _rawg;

  public GameService(RawgClient rawg)
  {
    _rawg = rawg;
  }

  public async Task<List<Game>> SearchGames(string query)
  {
    var rawgGames = await _rawg.GetGames(query);

    return rawgGames.Select(g => new Game
    {
      ExternalId = g.Id,
      Name = g.Name,
      ImageUrl = g.Background_Image
    }).ToList();
  }
}