using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.CharacterMatch;

public interface ICharacterMatchService
{
    Task<PagedResult<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId, string? search, int page, int pageSize);
    Task<CharacterMatchDto?> GetMatchByIdAsync(Guid userId, Guid matchId);
}
