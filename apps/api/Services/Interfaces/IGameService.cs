using PartyUp.Api.Domain.Models;

public interface IGameService
{
  Task<List<Game>> SearchGames(string query);
  Task<GameDetails?> GetGameById(int id);
}