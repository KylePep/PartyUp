using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;

namespace PartyUp.Api.Services.Interfaces;

public interface IGameFieldDefinitionService
{
    Task SaveDefinitionsAsync(Guid gameId, List<GameFieldDefinitionDto> dtos);
    Task<List<GameFieldDefinition>> GetDefinitionsAsync(Guid gameId);
}
