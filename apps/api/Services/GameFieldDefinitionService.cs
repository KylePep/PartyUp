using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class GameFieldDefinitionService : IGameFieldDefinitionService
{
    private readonly AppDbContext _db;

    public GameFieldDefinitionService(AppDbContext db)
    {
        _db = db;
    }

    public async Task SaveDefinitionsAsync(Guid gameId, List<GameFieldDefinitionDto> dtos)
    {
        var validDtos = dtos.Where(d =>
            !string.IsNullOrWhiteSpace(d.Key) &&
            !string.IsNullOrWhiteSpace(d.Label) &&
            (d.Type == "Text" || d.Options.Count > 0)).ToList();

        var definitions = validDtos.Select(dto => new GameFieldDefinition
        {
            GameId = gameId,
            Key = dto.Key,
            Label = dto.Label,
            Type = Enum.TryParse<FieldType>(dto.Type, out var ft) ? ft : FieldType.Text,
            Options = dto.Options,
            IsFilterable = dto.IsFilterable,
            IsRequired = dto.IsRequired,
            SortOrder = dto.SortOrder,
            CommonField = dto.CommonField
        }).ToList();

        _db.GameFieldDefinitions.AddRange(definitions);
        await _db.SaveChangesAsync();
    }

    public async Task<List<GameFieldDefinition>> GetDefinitionsAsync(Guid gameId)
    {
        return await _db.GameFieldDefinitions
            .Where(d => d.GameId == gameId)
            .OrderBy(d => d.SortOrder)
            .ToListAsync();
    }
}
