public interface ICharacterInteractionService
{
  Task<MatchResponse> RecordInteractionAsync(CharacterInteractionRequest request);
}
