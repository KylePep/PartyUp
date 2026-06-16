using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class GameSchemaGenerationService : IGameSchemaGenerationService
{
    private readonly AppDbContext _db;
    private readonly IAnthropicService _anthropic;
    private readonly IGameFieldDefinitionService _fieldDefinitions;
    private readonly ILogger<GameSchemaGenerationService> _logger;

    public GameSchemaGenerationService(
        AppDbContext db,
        IAnthropicService anthropic,
        IGameFieldDefinitionService fieldDefinitions,
        ILogger<GameSchemaGenerationService> logger)
    {
        _db = db;
        _anthropic = anthropic;
        _fieldDefinitions = fieldDefinitions;
        _logger = logger;
    }

    public async Task GenerateForGameAsync(Guid gameId, bool force = false)
    {
        var game = await _db.Games.FindAsync(gameId);
        if (game == null) return;
        if (!force && game.SchemaStatus != SchemaStatus.Pending) return;

        game.SchemaStatus = SchemaStatus.Generating;
        var stale = _db.GameFieldDefinitions.Where(d => d.GameId == gameId);
        _db.GameFieldDefinitions.RemoveRange(stale);
        await _db.SaveChangesAsync();

        try
        {
            var dtos = await _anthropic.GenerateFieldDefinitionsAsync(game);
            await _fieldDefinitions.SaveDefinitionsAsync(gameId, dtos);
            game.SchemaStatus = SchemaStatus.Generated;
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate schema for game {GameId} ({GameName})", gameId, game.Name);
            game.SchemaStatus = SchemaStatus.Failed;
            await _db.SaveChangesAsync();
        }
    }
}
