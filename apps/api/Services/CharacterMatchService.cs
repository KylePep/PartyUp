using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.Character;
using PartyUp.Api.Models.DTOs.CharacterMatch;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class CharacterMatchService : ICharacterMatchService
{
    private readonly AppDbContext _db;
    private readonly IMatchNotificationService _notifications;

    public CharacterMatchService(AppDbContext db, IMatchNotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    public async Task<PagedResult<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId, string? search, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(m => m.CharacterA).ThenInclude(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(m => m.CharacterB).ThenInclude(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
            .Where(m =>
                m.CharacterA.UserGame.UserId == userId ||
                m.CharacterB.UserGame.UserId == userId);

        if (gameId.HasValue)
            query = query.Where(m =>
                (m.CharacterA.UserGame.UserId == userId && m.CharacterA.UserGame.GameId == gameId.Value) ||
                (m.CharacterB.UserGame.UserId == userId && m.CharacterB.UserGame.GameId == gameId.Value));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(m =>
                (m.CharacterA.UserGame.UserId == userId && m.CharacterB.Name.ToLower().Contains(term)) ||
                (m.CharacterB.UserGame.UserId == userId && m.CharacterA.Name.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync();
        var matches = await query
            .OrderBy(m => m.CharacterA.UserGame.UserId == userId
                ? m.CharacterA.UserGame.Game.Name
                : m.CharacterB.UserGame.Game.Name)
            .ThenByDescending(m => m.MatchedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var matchIds = matches.Select(m => m.Id).ToList();
        var newMatchIds = await _notifications.GetNewMatchIdsAsync(userId, matchIds);

        var items = matches.Select(m =>
        {
            var isMineA = m.CharacterA.UserGame.UserId == userId;
            var mine = isMineA ? m.CharacterA : m.CharacterB;
            var theirs = isMineA ? m.CharacterB : m.CharacterA;

            return new CharacterMatchDto
            {
                MatchId = m.Id,
                MatchedAt = m.MatchedAt,
                MyCharacter = ToSummary(mine),
                TheirCharacter = ToProjection(theirs),
                GameId = mine.UserGame.GameId,
                GameName = mine.UserGame.Game.Name,
                GameImageUrl = mine.UserGame.Game.ImageUrl,
                IsNew = newMatchIds.Contains(m.Id)
            };
        }).ToList();

        return new PagedResult<CharacterMatchDto>(items, totalCount, page, pageSize);
    }

    public async Task<CharacterMatchDto?> GetMatchByIdAsync(Guid userId, Guid matchId)
    {
        var match = await _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(m => m.CharacterA).ThenInclude(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(m => m.CharacterB).ThenInclude(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
            .Where(m => m.Id == matchId && (
                m.CharacterA.UserGame.UserId == userId ||
                m.CharacterB.UserGame.UserId == userId))
            .FirstOrDefaultAsync();

        if (match is null) return null;

        var isMineA = match.CharacterA.UserGame.UserId == userId;
        var mine = isMineA ? match.CharacterA : match.CharacterB;
        var theirs = isMineA ? match.CharacterB : match.CharacterA;
        var isNew = (await _notifications.GetNewMatchIdsAsync(userId, [match.Id])).Contains(match.Id);

        return new CharacterMatchDto
        {
            MatchId = match.Id,
            MatchedAt = match.MatchedAt,
            MyCharacter = ToSummary(mine),
            TheirCharacter = ToProjection(theirs),
            GameId = mine.UserGame.GameId,
            GameName = mine.UserGame.Game.Name,
            GameImageUrl = mine.UserGame.Game.ImageUrl,
            IsNew = isNew
        };
    }

    private static CharacterSummaryDto ToSummary(Character c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        ImageUrl = c.ImageUrl,
        Bio = c.Bio,
        AdditionalNotes = c.AdditionalNotes,
        PlatformHandle = c.PlatformHandle,
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

    private static CharacterResponse ToProjection(Character c) => new()
    {
        Id = c.Id,
        UserGameId = c.UserGameId,
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
