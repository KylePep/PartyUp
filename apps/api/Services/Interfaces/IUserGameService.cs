using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;

public interface IUserGameService
{
  Task<bool> AddGameToUser(Guid userId, AddUserGameRequest request);
  Task<List<Game>> GetUserGames(Guid userId);
  Task<bool> DeleteUserGame(Guid id, Guid userId);
}
