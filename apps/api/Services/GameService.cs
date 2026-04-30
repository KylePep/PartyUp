using PartyUp.Api.Domain.Models.Rawg;
using PartyUp.Api.Infrastructure.Clients;

namespace PartyUp.Api.Services;

public class GameService
{
  private readonly RawgClient _rawg;

  public GameService(RawgClient rawg)
  {
    _rawg = rawg;
  }

  public async Task<List<RawgGame>> SearchGames(string query)
  {
    return await _rawg.GetGames(query);
  }
}