using PartyUp.Api.Models;

public interface IGameService
{
  Task<PagedGamesResult> SearchGames(string q, int page, List<int>? genres, List<string>? tags);
  Task<GameDetails?> GetGameById(int id);
}
