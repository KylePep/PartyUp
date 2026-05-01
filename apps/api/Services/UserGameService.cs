using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Infrastructure.Data;

public class UserGameService : IUserGameService
{
  private readonly AppDbContext _db;

  public UserGameService(AppDbContext db)
  {
    _db = db;
  }

  public async Task AddGameToUser(Guid userId, Game game)
  {
    var existingGame = await _db.Games
    .FirstOrDefaultAsync(g => g.ExternalId == game.ExternalId);

    if (existingGame == null)
    {
      existingGame = game;
      _db.Games.Add(existingGame);
      await _db.SaveChangesAsync();
    }

    var userGame = new UserGame
    {
      UserId = userId,
      GameId = existingGame.Id
    };

    _db.UserGames.Add(userGame);
    await _db.SaveChangesAsync();
  }

  public async Task<List<Game>> GetUserGames(Guid userId)
  {
    return await _db.UserGames
      .Where(ug => ug.UserId == userId)
      .Include(ug => ug.Game)
      .Select(ug => ug.Game)
      .ToListAsync();
  }
}