using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Services.Interfaces;

public class UserGameService : IUserGameService
{
    private readonly AppDbContext _db;
    private readonly IGameService _gameService;
    private readonly IServiceScopeFactory _scopeFactory;

    public UserGameService(AppDbContext db, IGameService gameService, IServiceScopeFactory scopeFactory)
    {
        _db = db;
        _gameService = gameService;
        _scopeFactory = scopeFactory;
    }

    public async Task<UserGame> AddGameToUser(Guid userId, AddUserGameRequest request)
    {
        var existingGame = await _gameService.getGameByExternalId(request.ExternalId);
        var isNewGame = existingGame == null;

        if (isNewGame)
            existingGame = await _gameService.GetAndPersistGameDetails(request.ExternalId);

        if (existingGame == null)
            throw new InvalidOperationException("Game not found.");

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

        if (isNewGame)
        {
            var gameId = existingGame.Id;
            _ = Task.Run(async () =>
            {
                using var scope = _scopeFactory.CreateScope();
                var generator = scope.ServiceProvider.GetRequiredService<IGameSchemaGenerationService>();
                await generator.GenerateForGameAsync(gameId);
            });
        }

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
