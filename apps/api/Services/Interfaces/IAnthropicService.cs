using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;

namespace PartyUp.Api.Services.Interfaces;

public interface IAnthropicService
{
    Task<List<GameFieldDefinitionDto>> GenerateFieldDefinitionsAsync(Game game);
}
