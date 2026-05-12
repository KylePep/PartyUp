using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;

public interface IUserGameService
{
  Task<UserGame> AddGameToUser(Guid userId, AddUserGameRequest request);
  Task<List<UserGame>> GetUserGames(Guid userId);
  Task<UserGame?> GetUserGameByGameId(Guid userId, Guid gameId);
  Task<bool> DeleteUserGame(Guid id, Guid userId);
}
