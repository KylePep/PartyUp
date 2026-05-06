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
      Bio = request.Bio,
      Playstyle = request.Playstyle,
      Rank = request.Rank,
      Region = request.Region,
    };

    _db.Characters.Add(character);
    await _db.SaveChangesAsync();

    return ToResponse(character);
  }

  public async Task<List<CharacterResponse>> GetCharactersForUserGameAsync(
    Guid userId,
    Guid userGameId)
  {
    var userGameExists = await _db.UserGames
      .AnyAsync(x => x.Id == userGameId && x.UserId == userId);

    if (!userGameExists)
      return [];

    return await _db.Characters
      .Where(x => x.UserGameId == userGameId)
      .Select(x => ToResponse(x))
      .ToListAsync();
  }

  public async Task<List<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId)
  {
    return await _db.Characters
      .Include(c => c.UserGame)
      .Where(c => c.UserGame.UserId == userId)
      .Select(c => ToResponse(c))
      .ToListAsync();
  }

  public async Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(Guid userId, Guid gameId)
  {
    var myUserGame = await _db.UserGames
      .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);

    if (myUserGame == null)
      return [];

    var myCharacterIds = await _db.Characters
      .Where(c => c.UserGameId == myUserGame.Id)
      .Select(c => c.Id)
      .ToListAsync();

    if (myCharacterIds.Count == 0)
      return [];

    var alreadySeenIds = await _db.CharacterInteractions
      .Where(i => myCharacterIds.Contains(i.FromCharacterId))
      .Select(i => i.ToCharacterId)
      .ToListAsync();

    return await _db.Characters
      .Include(c => c.UserGame)
        .ThenInclude(ug => ug.Game)
      .Where(c =>
        c.UserGame.GameId == gameId &&
        c.UserGame.UserId != userId &&
        !alreadySeenIds.Contains(c.Id))
      .Select(c => new DiscoverCharacterResponse
      {
        Id = c.Id,
        Name = c.Name,
        Bio = c.Bio,
        Playstyle = c.Playstyle,
        Rank = c.Rank,
        Region = c.Region,
        GameName = c.UserGame.Game.Name,
        GameImageUrl = c.UserGame.Game.ImageUrl,
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
    character.Bio = request.Bio;
    character.Playstyle = request.Playstyle;
    character.Rank = request.Rank;
    character.Region = request.Region;

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

  private static CharacterResponse ToResponse(Character c) => new()
  {
    Id = c.Id,
    UserGameId = c.UserGameId,
    Name = c.Name,
    Nickname = c.Nickname,
    Bio = c.Bio,
    Playstyle = c.Playstyle,
    Rank = c.Rank,
    Region = c.Region,
    CreatedAt = c.CreatedAt,
  };
}
