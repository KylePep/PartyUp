using PartyUp.Api.Models.DTOs.CharacterMatch;

public interface ICharacterMatchService
{
    Task<List<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId);
}
