using PartyUp.Api.Models.DTOs.Character;
using PartyUp.Api.Models.DTOs.CharacterInteraction;

public interface ICharacterInteractionService
{
    Task<MatchResultResponse> RecordInteractionAsync(CharacterInteractionRequest request, Guid userId);
    Task<List<DiscoverCharacterResponse>> GetPendingLikesAsync(Guid characterId, Guid userId);
}
