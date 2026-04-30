using PartyUp.Api.Domain.Models;

public interface IUserGameService
{
  Task AddGameToUser(string userId, Game game);
  Task<List<Game>> GetUserGames(string userId);
}