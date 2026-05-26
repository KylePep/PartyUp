using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Tests.Infrastructure;

public class NoOpGameSchemaGenerationService : IGameSchemaGenerationService
{
    public Task GenerateForGameAsync(Guid gameId) => Task.CompletedTask;
}
