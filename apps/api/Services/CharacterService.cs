using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Character;

namespace PartyUp.Api.Services;

public class CharacterService : ICharacterService
{
  private readonly AppDbContext _db;

  public CharacterService(AppDbContext db)
  {
    _db = db;
  }

  public async Task<CharacterResponse?> CreateCharacterAsync(
    Guid userId,
    Guid userGameId,
    CreateCharacterRequest request)
  {
    var userGame = await _db.UserGames
      .FirstOrDefaultAsync(x => x.Id == userGameId && x.UserId == userId);

    if (userGame == null)
      return null;

    var character = new Character
    {
      Id = Guid.NewGuid(),
      UserGameId = userGameId,
      Name = request.Name,
      Nickname = request.Nickname,
      Description = request.Description,
      PlayStyle = request.PlayStyle
    };

    _db.Characters.Add(character);
    await _db.SaveChangesAsync();

    return new CharacterResponse
    {
      Id = character.Id,
      UserGameId = character.UserGameId,
      Name = character.Name,
      Nickname = character.Nickname,
      Description = character.Description,
      PlayStyle = character.PlayStyle
    };
  }

  public async Task<List<CharacterResponse>> GetCharactersForUserGameAsync(
    Guid userId,
    Guid userGameId)
  {
    var userGameExists = await _db.UserGames
      .AnyAsync(x => x.Id == userGameId && x.UserId == userId);

    if (!userGameExists)
      return new List<CharacterResponse>();

    return await _db.Characters
    .Where(x => x.UserGameId == userGameId)
    .Select(x => new CharacterResponse
    {
      Id = x.Id,
      UserGameId = x.UserGameId,
      Name = x.Name,
      Nickname = x.Nickname,
      Description = x.Description,
      PlayStyle = x.PlayStyle
    })
    .ToListAsync();
  }

  public async Task<bool> UpdateCharacterAsync(
    Guid userId,
    Guid userGameId,
    Guid characterId,
    UpdateCharacterRequest request)
  {
    var character = await _db.Characters
        .Include(c => c.UserGame)
        .FirstOrDefaultAsync(c =>
            c.Id == characterId &&
            c.UserGameId == userGameId &&
            c.UserGame.UserId == userId);

    if (character == null)
      return false;

    character.Name = request.Name;
    character.Nickname = request.Nickname;
    character.Description = request.Description;
    character.PlayStyle = request.PlayStyle;

    await _db.SaveChangesAsync();

    return true;
  }

  public async Task<bool> DeleteCharacterAsync(
      Guid userId,
      Guid userGameId,
      Guid characterId)
  {
    var character = await _db.Characters
        .Include(c => c.UserGame)
        .FirstOrDefaultAsync(c =>
            c.Id == characterId &&
            c.UserGameId == userGameId &&
            c.UserGame.UserId == userId);

    if (character == null)
      return false;

    _db.Characters.Remove(character);

    await _db.SaveChangesAsync();

    return true;
  }


}