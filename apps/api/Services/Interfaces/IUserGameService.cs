using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.UserGame;

public interface IUserGameService
{
  Task<AddGameResult> AddGameToUser(Guid userId, AddUserGameRequest request);
  Task<PagedResult<UserGameResponse>> GetUserGames(Guid userId, int page, int pageSize);
  Task<UserGameDetailResponse?> GetUserGameByGameId(Guid userId, Guid gameId);
  Task<bool> DeleteUserGame(Guid id, Guid userId);
}
