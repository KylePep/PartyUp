using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Services.Interfaces;

public class UserGameService : IUserGameService
{
    private readonly AppDbContext _db;
    private readonly IGameService _gameService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<UserGameService> _logger;

    public UserGameService(AppDbContext db, IGameService gameService, IServiceScopeFactory scopeFactory, ILogger<UserGameService> logger)
    {
        _db = db;
        _gameService = gameService;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<AddGameResult> AddGameToUser(Guid userId, AddUserGameRequest request)
    {
        var existingSelected = await _gameService.getGameByExternalId(request.ExternalId);
        var isSelectedNew = existingSelected == null;
        var selectedGame = existingSelected ?? await _gameService.GetAndPersistGameDetails(request.ExternalId);

        if (selectedGame == null)
            throw new InvalidOperationException("Game not found.");

        Game canonicalGame;
        bool redirected = false;
        string? message = null;
        bool triggerSchemaGen;
        Guid schemaGenGameId;

        if (selectedGame.ParentExternalId.HasValue)
        {
            var existingParent = await _gameService.getGameByExternalId(selectedGame.ParentExternalId.Value);
            var isParentNew = existingParent == null;
            var parent = existingParent ?? await _gameService.GetAndPersistGameDetails(selectedGame.ParentExternalId.Value);

            // Fall back to selected game if RAWG is unreachable
            canonicalGame = parent ?? selectedGame;
            redirected = parent != null;

            if (redirected)
            {
                message = $"{selectedGame.Name} is an expansion — we've added you to {canonicalGame.Name} instead.";
                triggerSchemaGen = isParentNew;
                schemaGenGameId = canonicalGame.Id;
            }
            else
            {
                triggerSchemaGen = isSelectedNew;
                schemaGenGameId = selectedGame.Id;
            }
        }
        else
        {
            canonicalGame = selectedGame;
            triggerSchemaGen = isSelectedNew;
            schemaGenGameId = selectedGame.Id;
        }

        var alreadyAdded = await _db.UserGames
            .AnyAsync(ug => ug.UserId == userId && ug.GameId == canonicalGame.Id);

        if (alreadyAdded)
            throw new InvalidOperationException("Game already added.");

        var userGame = new UserGame
        {
            UserId = userId,
            GameId = canonicalGame.Id,
            Game = canonicalGame
        };

        _db.UserGames.Add(userGame);
        await _db.SaveChangesAsync();

        if (triggerSchemaGen)
        {
            var gameId = schemaGenGameId;
            _ = Task.Run(async () =>
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                try
                {
                    var generator = scope.ServiceProvider.GetRequiredService<IGameSchemaGenerationService>();
                    await generator.GenerateForGameAsync(gameId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Schema generation failed for game {GameId} — marking as Failed", gameId);
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var g = await db.Games.FindAsync(gameId);
                    if (g != null && g.SchemaStatus == SchemaStatus.Pending)
                    {
                        g.SchemaStatus = SchemaStatus.Failed;
                        await db.SaveChangesAsync();
                    }
                }
            });
        }

        return new AddGameResult
        {
            UserGame = userGame,
            Redirected = redirected,
            Message = message
        };
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
