using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.UserGame;

public interface IUserGameService
{
  Task<AddGameResult> AddGameToUser(Guid userId, AddUserGameRequest request);
  Task<PagedResult<UserGame>> GetUserGames(Guid userId, int page, int pageSize);
  Task<UserGame?> GetUserGameByGameId(Guid userId, Guid gameId);
  Task<bool> DeleteUserGame(Guid id, Guid userId);
}
