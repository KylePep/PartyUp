using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.Character;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class CharacterService : ICharacterService
{
  private readonly AppDbContext _db;
  private readonly IGcsStorageService _gcs;
  private readonly IMatchNotificationService _notifications;

  public CharacterService(AppDbContext db, IGcsStorageService gcs, IMatchNotificationService notifications)
  {
    _db = db;
    _gcs = gcs;
    _notifications = notifications;
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
      TimeZone = request.TimeZone,
      ActiveTimes = request.ActiveTimes,
      UsesVoiceChat = request.UsesVoiceChat,
      Languages = request.Languages,
      AdditionalNotes = request.AdditionalNotes,
      CardBackgroundColor = request.CardBackgroundColor,
      ImageFocalX = request.ImageFocalX,
      ImageFocalY = request.ImageFocalY,
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

    return await _db.Characters
      .Where(c => c.Id == character.Id)
      .Select(ToProjection())
      .FirstAsync();
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
      .Select(ToProjection())
      .ToListAsync();
  }

  public async Task<PagedResult<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId, int page, int pageSize)
  {
    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 50);

    var query = _db.Characters
      .Where(c => c.UserGame.UserId == userId)
      .OrderByDescending(c => c.CreatedAt);

    var totalCount = await query.CountAsync();
    var characters = await query
      .Skip((page - 1) * pageSize)
      .Take(pageSize)
      .Select(ToProjection())
      .ToListAsync();

    var characterIds = characters.Select(c => c.Id).ToList();
    var newMatchIds = await _notifications.GetCharacterIdsWithNewMatchAsync(userId, characterIds);

    foreach (var c in characters)
      c.HasNewMatch = newMatchIds.Contains(c.Id);

    return new PagedResult<CharacterResponse>(characters, totalCount, page, pageSize);
  }

  public async Task<CharacterResponse?> GetCharacterByIdAsync(Guid userId, Guid characterId)
  {
    return await _db.Characters
      .Where(c => c.Id == characterId && c.UserGame.UserId == userId)
      .Select(ToProjection())
      .FirstOrDefaultAsync();
  }

  public async Task<PagedDiscoverResult> DiscoverCharactersAsync(
    Guid userId, Guid gameId,
    Dictionary<string, string>? filters = null,
    List<string>? platformFilters = null,
    int page = 1, int pageSize = 20)
  {
    var myUserGame = await _db.UserGames
      .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);

    if (myUserGame == null)
      return new PagedDiscoverResult();

    var myCharacterIds = await _db.Characters
      .Where(c => c.UserGameId == myUserGame.Id)
      .Select(c => c.Id)
      .ToListAsync();

    if (myCharacterIds.Count == 0)
      return new PagedDiscoverResult();

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

    if (platformFilters != null && platformFilters.Count > 0)
      query = query.Where(c => platformFilters.Contains(c.Platform));

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

    var totalCount = await query.CountAsync();

    var items = await query
      .Skip((page - 1) * pageSize)
      .Take(pageSize)
      .Select(c => new DiscoverCharacterResponse
      {
        Id = c.Id,
        Name = c.Name,
        Platform = c.Platform,
        ImageUrl = c.ImageUrl,
        Bio = c.Bio,
        UsesVoiceChat = c.UsesVoiceChat,
        Languages = c.Languages,
        AdditionalNotes = c.AdditionalNotes,
        CardBackgroundColor = c.CardBackgroundColor,
        ImageFocalX = c.ImageFocalX,
        ImageFocalY = c.ImageFocalY,
        GameName = c.UserGame.Game.Name,
        GameImageUrl = c.UserGame.Game.ImageUrl,
        GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
        {
          FieldDefinitionId = fv.FieldDefinitionId,
          Key = fv.FieldDefinition.Key,
          Label = fv.FieldDefinition.Label,
          Value = fv.Value,
          Type = fv.FieldDefinition.Type.ToString(),
          CommonField = fv.FieldDefinition.CommonField
        }).ToList(),
      })
      .ToListAsync();

    return new PagedDiscoverResult
    {
      Items = items,
      HasMore = page * pageSize < totalCount,
      TotalCount = totalCount
    };
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
    character.TimeZone = request.TimeZone;
    character.ActiveTimes = request.ActiveTimes;
    character.UsesVoiceChat = request.UsesVoiceChat;
    character.Languages = request.Languages;
    character.AdditionalNotes = request.AdditionalNotes;
    character.CardBackgroundColor = request.CardBackgroundColor;
    character.ImageFocalX = request.ImageFocalX;
    character.ImageFocalY = request.ImageFocalY;

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

    var imageUrl = character.ImageUrl;
    _db.Characters.Remove(character);
    await _db.SaveChangesAsync();

    if (!string.IsNullOrEmpty(imageUrl))
      await _gcs.DeleteByUrlAsync(imageUrl);

    return true;
  }

  private static System.Linq.Expressions.Expression<Func<Character, CharacterResponse>> ToProjection() =>
    c => new CharacterResponse
    {
      Id = c.Id,
      UserGameId = c.UserGameId,
      GameId = c.UserGame.GameId,
      Platform = c.Platform,
      PlatformHandle = c.PlatformHandle,
      Name = c.Name,
      ImageUrl = c.ImageUrl,
      Bio = c.Bio,
      TimeZone = c.TimeZone,
      ActiveTimes = c.ActiveTimes,
      UsesVoiceChat = c.UsesVoiceChat,
      Languages = c.Languages,
      AdditionalNotes = c.AdditionalNotes,
      CardBackgroundColor = c.CardBackgroundColor,
      ImageFocalX = c.ImageFocalX,
      ImageFocalY = c.ImageFocalY,
      GameName = c.UserGame.Game.Name,
      GameImageUrl = c.UserGame.Game.ImageUrl,
      CreatedAt = c.CreatedAt,
      GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
      {
        FieldDefinitionId = fv.FieldDefinitionId,
        Key = fv.FieldDefinition.Key,
        Label = fv.FieldDefinition.Label,
        Value = fv.Value,
        Type = fv.FieldDefinition.Type.ToString(),
        CommonField = fv.FieldDefinition.CommonField
      }).ToList(),
    };
}
