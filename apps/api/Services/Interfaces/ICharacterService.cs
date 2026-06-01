using PartyUp.Api.Models.DTOs.Character;

public interface ICharacterService
{
  Task<CharacterResponse?> CreateCharacterAsync(Guid userId, Guid userGameId, CreateCharacterRequest request);
  Task<List<CharacterResponse>> GetCharactersForUserGameAsync(Guid userId, Guid userGameId);
  Task<List<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId);
  Task<CharacterResponse?> GetCharacterByIdAsync(Guid userId, Guid characterId);
  Task<PagedDiscoverResult> DiscoverCharactersAsync(
      Guid userId,
      Guid gameId,
      Dictionary<string, string>? filters = null,
      List<string>? platformFilters = null,
      int page = 1,
      int pageSize = 20);
  Task<bool> UpdateCharacterAsync(Guid userId, Guid userGameId, Guid characterId, UpdateCharacterRequest request);
  Task<bool> DeleteCharacterAsync(Guid userId, Guid userGameId, Guid characterId);
}
