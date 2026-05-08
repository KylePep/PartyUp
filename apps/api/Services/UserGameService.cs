using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;
using PartyUp.Api.Infrastructure.Data;

public class UserGameService : IUserGameService
{
  private readonly AppDbContext _db;
  private readonly IGameService _gameService;

  public UserGameService(AppDbContext db, IGameService gameService)
  {
    _db = db;
    _gameService = gameService;
  }

  public async Task<UserGame> AddGameToUser(Guid userId, AddUserGameRequest request)
  {
    var existingGame = await _db.Games
      .FirstOrDefaultAsync(g => g.ExternalId == request.ExternalId);

    if (existingGame == null)
    {
      existingGame = new Game
      {
        ExternalId = request.ExternalId,
        Name = request.Name,
        ImageUrl = request.ImageUrl
      };
      _db.Games.Add(existingGame);
      await _db.SaveChangesAsync();
    }

    if (existingGame.Description == null)
    {
      try { await _gameService.GetAndPersistGameDetails(existingGame); }
      catch { /* enrichment is best-effort; continue without details */ }
    }

    var alreadyAdded = await _db.UserGames
      .AnyAsync(ug => ug.UserId == userId && ug.GameId == existingGame.Id);

    if (alreadyAdded)
      throw new InvalidOperationException("Game already added.");

    var userGame = new UserGame
    {
      UserId = userId,
      GameId = existingGame.Id,
      Game = existingGame
    };

    _db.UserGames.Add(userGame);
    await _db.SaveChangesAsync();

    return userGame;
  }

  public async Task<List<UserGame>> GetUserGames(Guid userId)
  {
    return await _db.UserGames
      .Where(ug => ug.UserId == userId)
      .Include(ug => ug.Game)
      .ToListAsync();
  }

  public async Task<UserGame?> GetUserGameByGameId(Guid userId, Guid gameId)
  {
    return await _db.UserGames
      .Include(ug => ug.Game)
      .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);
  }

  public async Task<bool> DeleteUserGame(Guid id, Guid userId)
  {
    var userGame = await _db.UserGames
      .FirstOrDefaultAsync(ug => ug.Id == id && ug.UserId == userId);

    if (userGame == null)
      return false;

    _db.UserGames.Remove(userGame);
    await _db.SaveChangesAsync();
    return true;
  }
}
