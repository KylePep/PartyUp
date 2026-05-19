namespace PartyUp.Api.Services.Interfaces;

public interface IGameSchemaGenerationService
{
    Task GenerateForGameAsync(Guid gameId);
}
