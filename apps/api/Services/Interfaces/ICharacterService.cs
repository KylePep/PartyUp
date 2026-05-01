using PartyUp.Api.Models.DTOs.Character;

public interface ICharacterService
{
  Task<CharacterResponse?> CreateCharacterAsync(Guid userId, Guid userGameId, CreateCharacterRequest request);
  Task<List<CharacterResponse>> GetCharactersForUserGameAsync(Guid userId, Guid userGameId);
  Task<bool> UpdateCharacterAsync(
        Guid userId,
        Guid userGameId,
        Guid characterId,
        UpdateCharacterRequest request);

  Task<bool> DeleteCharacterAsync(
      Guid userId,
      Guid userGameId,
      Guid characterId);
}