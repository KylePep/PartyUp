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

        var selectedGame = existingSelected ?? await _gameService.GetAndPersistGameDetails(request.ExternalId);

        if (selectedGame == null)
            throw new InvalidOperationException("Game not found.");

        var triggerSchemaGen = isSelectedNew || selectedGame.SchemaStatus == SchemaStatus.Pending;

        var alreadyAdded = await _db.UserGames
            .AnyAsync(ug => ug.UserId == userId && ug.GameId == selectedGame.Id);

        if (alreadyAdded)
            throw new InvalidOperationException("Game already added.");

        var userGame = new UserGame
        {
            UserId = userId,
            GameId = selectedGame.Id,
            Game = selectedGame,
            CreatedAt = DateTime.UtcNow
        };

        _db.UserGames.Add(userGame);
        await _db.SaveChangesAsync();

        if (triggerSchemaGen)
        {
            var gameId = selectedGame.Id;
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
                    _logger.LogError(ex, "Schema generation task failed for game {GameId}", gameId);
                }
            });
        }

        return new AddGameResult { UserGame = userGame };
    }

    public async Task<PagedResult<UserGameResponse>> GetUserGames(Guid userId, int page, int pageSize)
    {
        var query = _db.UserGames
            .Where(ug => ug.UserId == userId)
            .Include(ug => ug.Game)
            .OrderByDescending(ug => ug.CreatedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ug => new UserGameResponse
            {
                Id = ug.Id,
                UserId = ug.UserId,
                GameId = ug.GameId,
                GameName = ug.Game.Name,
                GameImageUrl = ug.Game.ImageUrl,
                CreatedAt = ug.CreatedAt,
                NewMatchCount = 0
            })
            .ToListAsync();

        return new PagedResult<UserGameResponse>(items, totalCount, page, pageSize);
    }

    public async Task<UserGameDetailResponse?> GetUserGameByGameId(Guid userId, Guid gameId)
    {
        var ug = await _db.UserGames
            .Include(ug => ug.Game)
            .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);

        if (ug == null) return null;

        return new UserGameDetailResponse
        {
            Id = ug.Id,
            UserId = ug.UserId,
            GameId = ug.GameId,
            GameName = ug.Game.Name,
            GameImageUrl = ug.Game.ImageUrl,
            Description = ug.Game.Description,
            Website = ug.Game.Website,
            Rating = ug.Game.Rating,
            Platforms = ug.Game.Platforms
        };
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
