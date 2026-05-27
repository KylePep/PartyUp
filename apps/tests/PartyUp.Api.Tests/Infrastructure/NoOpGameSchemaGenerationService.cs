using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Tests.Infrastructure;

public class NoOpGameSchemaGenerationService : IGameSchemaGenerationService
{
    public Task GenerateForGameAsync(Guid gameId, bool force = false) => Task.CompletedTask;
}
