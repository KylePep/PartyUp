using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.CharacterMatch;

public interface ICharacterMatchService
{
    Task<PagedResult<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId, int page, int pageSize);
}
