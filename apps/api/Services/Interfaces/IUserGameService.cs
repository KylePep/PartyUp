using PartyUp.Api.Models;

public interface IUserGameService
{
  Task AddGameToUser(Guid userId, Game game);
  Task<List<Game>> GetUserGames(Guid userId);
}