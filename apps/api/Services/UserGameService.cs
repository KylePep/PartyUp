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
        var rawItems = await _db.UserGames
            .Where(ug => ug.UserId == userId)
            .Select(ug => new
            {
                Id = ug.Id,
                UserId = ug.UserId,
                GameId = ug.GameId,
                GameName = ug.Game.Name,
                GameImageUrl = ug.Game.ImageUrl,
                CreatedAt = ug.CreatedAt,
                LatestInteraction = _db.CharacterInteractions
                    .Where(ci => _db.Characters
                        .Where(c => c.UserGameId == ug.Id)
                        .Select(c => c.Id)
                        .Contains(ci.FromCharacterId))
                    .Select(ci => (DateTime?)ci.CreatedAt)
                    .Max(),
                LatestMatch = _db.CharacterMatches
                    .Where(cm =>
                        _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterAId) ||
                        _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterBId))
                    .Select(cm => (DateTime?)cm.MatchedAt)
                    .Max(),
                LatestMessage = _db.StickerMessages
                    .Where(sm => _db.CharacterMatches
                        .Where(cm =>
                            _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterAId) ||
                            _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterBId))
                        .Select(cm => cm.Id)
                        .Contains(sm.MatchId))
                    .Select(sm => (DateTime?)sm.SentAt)
                    .Max()
            })
            .ToListAsync();

        var totalCount = rawItems.Count;

        var items = rawItems
            .Select(x =>
            {
                var lastActivityAt = new[] { x.LatestInteraction, x.LatestMatch, x.LatestMessage }
                    .Where(d => d.HasValue)
                    .Select(d => d!.Value)
                    .Append(x.CreatedAt)
                    .Max();
                return (Item: x, LastActivityAt: lastActivityAt);
            })
            .OrderByDescending(x => x.LastActivityAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new UserGameResponse
            {
                Id = x.Item.Id,
                UserId = x.Item.UserId,
                GameId = x.Item.GameId,
                GameName = x.Item.GameName,
                GameImageUrl = x.Item.GameImageUrl,
                CreatedAt = x.Item.CreatedAt,
                NewMatchCount = 0
            })
            .ToList();

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
