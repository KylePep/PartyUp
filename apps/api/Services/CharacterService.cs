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
      Platform = request.Platform,
      PlatformHandle = request.PlatformHandle,
      Name = request.Name,
      ImageUrl = request.ImageUrl,
      Bio = request.Bio,
      MainRole = request.MainRole,
      SecondaryRole = request.SecondaryRole,
      PreferredModes = request.PreferredModes,
      TimeZone = request.TimeZone,
      ActiveTimes = request.ActiveTimes,
      UsesVoiceChat = request.UsesVoiceChat,
      Languages = request.Languages,
      Playstyle = request.Playstyle,
      Rank = request.Rank,
      Region = request.Region,
    };

    _db.Characters.Add(character);

    foreach (var field in request.GameFields)
    {
      _db.CharacterFieldValues.Add(new CharacterFieldValue
      {
        CharacterId = character.Id,
        FieldDefinitionId = field.FieldDefinitionId,
        Value = field.Value
      });
    }

    await _db.SaveChangesAsync();

    var saved = await _db.Characters
      .Include(c => c.FieldValues)
        .ThenInclude(fv => fv.FieldDefinition)
      .FirstAsync(c => c.Id == character.Id);

    return ToResponse(saved);
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
      .Include(c => c.FieldValues)
        .ThenInclude(fv => fv.FieldDefinition)
      .Where(x => x.UserGameId == userGameId)
      .Select(x => ToResponse(x))
      .ToListAsync();
  }

  public async Task<List<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId)
  {
    return await _db.Characters
      .Include(c => c.UserGame)
      .Include(c => c.FieldValues)
        .ThenInclude(fv => fv.FieldDefinition)
      .Where(c => c.UserGame.UserId == userId)
      .Select(c => ToResponse(c))
      .ToListAsync();
  }

  public async Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(Guid userId, Guid gameId, Dictionary<string, string>? filters = null)
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

    var query = _db.Characters
      .Include(c => c.UserGame)
        .ThenInclude(ug => ug.Game)
      .Where(c =>
        c.UserGame.GameId == gameId &&
        c.UserGame.UserId != userId &&
        !alreadySeenIds.Contains(c.Id));

    if (filters != null && filters.Count > 0)
    {
      var filterableKeys = (await _db.GameFieldDefinitions
        .Where(d => d.GameId == gameId && d.IsFilterable && d.Type == PartyUp.Api.Models.Enums.FieldType.Select)
        .Select(d => d.Key)
        .ToListAsync())
        .ToHashSet();

      foreach (var (key, value) in filters)
      {
        if (!filterableKeys.Contains(key))
          continue;
        var k = key;
        var v = value;
        query = query.Where(c => c.FieldValues.Any(fv =>
          fv.FieldDefinition.Key == k &&
          fv.Value == v));
      }
    }

    return await query
      .Select(c => new DiscoverCharacterResponse
      {
        Id = c.Id,
        Name = c.Name,
        Platform = c.Platform,
        ImageUrl = c.ImageUrl,
        Bio = c.Bio,
        MainRole = c.MainRole,
        SecondaryRole = c.SecondaryRole,
        PreferredModes = c.PreferredModes,
        UsesVoiceChat = c.UsesVoiceChat,
        Languages = c.Languages,
        Playstyle = c.Playstyle,
        Rank = c.Rank,
        Region = c.Region,
        GameName = c.UserGame.Game.Name,
        GameImageUrl = c.UserGame.Game.ImageUrl,
        GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
        {
          FieldDefinitionId = fv.FieldDefinitionId,
          Key = fv.FieldDefinition.Key,
          Label = fv.FieldDefinition.Label,
          Value = fv.Value,
          Type = fv.FieldDefinition.Type.ToString()
        }).ToList(),
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
      .Include(c => c.FieldValues)
      .FirstOrDefaultAsync(c =>
        c.Id == characterId &&
        c.UserGameId == userGameId &&
        c.UserGame.UserId == userId);

    if (character == null)
      return false;

    if (request.Platform != null) character.Platform = request.Platform;
    if (request.PlatformHandle != null) character.PlatformHandle = request.PlatformHandle;
    character.Name = request.Name;
    character.ImageUrl = request.ImageUrl;
    character.Bio = request.Bio;
    character.MainRole = request.MainRole;
    character.SecondaryRole = request.SecondaryRole;
    if (request.PreferredModes != null) character.PreferredModes = request.PreferredModes;
    character.TimeZone = request.TimeZone;
    character.ActiveTimes = request.ActiveTimes;
    character.UsesVoiceChat = request.UsesVoiceChat;
    character.Languages = request.Languages;
    character.Playstyle = request.Playstyle;
    character.Rank = request.Rank;
    character.Region = request.Region;

    if (request.GameFields != null)
    {
      _db.CharacterFieldValues.RemoveRange(character.FieldValues);
      foreach (var field in request.GameFields)
        _db.CharacterFieldValues.Add(new CharacterFieldValue
        {
          CharacterId = character.Id,
          FieldDefinitionId = field.FieldDefinitionId,
          Value = field.Value
        });
    }

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
    Platform = c.Platform,
    PlatformHandle = c.PlatformHandle,
    Name = c.Name,
    ImageUrl = c.ImageUrl,
    Bio = c.Bio,
    MainRole = c.MainRole,
    SecondaryRole = c.SecondaryRole,
    PreferredModes = c.PreferredModes,
    TimeZone = c.TimeZone,
    ActiveTimes = c.ActiveTimes,
    UsesVoiceChat = c.UsesVoiceChat,
    Languages = c.Languages,
    Playstyle = c.Playstyle,
    Rank = c.Rank,
    Region = c.Region,
    CreatedAt = c.CreatedAt,
    GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
    {
      Key = fv.FieldDefinition.Key,
      Label = fv.FieldDefinition.Label,
      Value = fv.Value,
      Type = fv.FieldDefinition.Type.ToString()
    }).ToList(),
  };
}
