using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;

public interface IGameService
{
  Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, bool? exclude_additions, List<string>? tags);
  Task<Game?> GetGameById(int id);
  Task<Game?> GetGameByDbId(Guid id);
  Task<Game?> getGameByExternalId(int id);
  Task<Game?> GetAndPersistGameDetails(int id);
}
