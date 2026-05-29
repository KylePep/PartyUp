using PartyUp.Api.Models.DTOs.Character;

public interface ICharacterInteractionService
{
    Task<MatchResponse> RecordInteractionAsync(CharacterInteractionRequest request, Guid userId);
    Task<List<DiscoverCharacterResponse>> GetPendingLikesAsync(Guid characterId, Guid userId);
}
