public interface ICharacterInteractionService
{
    Task<MatchResponse> RecordInteractionAsync(CharacterInteractionRequest request, Guid userId);
}
