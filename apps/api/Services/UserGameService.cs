using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs;
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
        var gameCount = await _db.UserGames.CountAsync(ug => ug.UserId == userId);
        if (gameCount >= 24)
            throw new InvalidOperationException("Realm limit of 24 reached.");

        var existingSelected = await _gameService.getGameByExternalId(request.ExternalId);
        var isSelectedNew = existingSelected == null;

        // If the game is already in the DB but was persisted before the
        // parent-games fix, ParentExternalId will be null even for DLCs.
        // Re-check RAWG so the redirect logic below can work correctly.
        if (existingSelected != null && !existingSelected.ParentExternalId.HasValue)
            await _gameService.TryPopulateParentExternalId(existingSelected);

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
            Game = canonicalGame,
            CreatedAt = DateTime.UtcNow
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

    public async Task<PagedResult<UserGame>> GetUserGames(Guid userId, int page, int pageSize)
    {
        var query = _db.UserGames
            .Where(ug => ug.UserId == userId)
            .Include(ug => ug.Game)
            .OrderByDescending(ug => ug.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<UserGame>(items, totalCount, page, pageSize);
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
