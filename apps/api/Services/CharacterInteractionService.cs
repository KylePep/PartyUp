using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Hubs;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Character;
using PartyUp.Api.Models.DTOs.CharacterInteraction;
using PartyUp.Api.Services.Interfaces;

public class CharacterInteractionService : ICharacterInteractionService
{
    private readonly AppDbContext _db;
    private readonly IMatchNotificationService _notifications;
    private readonly IHubContext<NotificationHub> _hub;

    public CharacterInteractionService(
        AppDbContext db,
        IMatchNotificationService notifications,
        IHubContext<NotificationHub> hub)
    {
        _db = db;
        _notifications = notifications;
        _hub = hub;
    }

    public async Task<MatchResultResponse> RecordInteractionAsync(CharacterInteractionRequest request, Guid userId)
    {
        if (request.FromCharacterId == request.ToCharacterId)
            throw new InvalidOperationException("Cannot interact with self");

        var fromChar = await _db.Characters
            .Include(c => c.UserGame).ThenInclude(ug => ug.Game)
            .FirstOrDefaultAsync(c => c.Id == request.FromCharacterId);

        if (fromChar == null || fromChar.UserGame.UserId != userId)
            throw new UnauthorizedAccessException("Character does not belong to the authenticated user");

        var toChar = await _db.Characters
            .Include(c => c.UserGame)
            .FirstAsync(c => c.Id == request.ToCharacterId);

        var recipientUserId = toChar.UserGame.UserId;

        var interaction = new CharacterInteraction
        {
            Id = Guid.NewGuid(),
            FromCharacterId = request.FromCharacterId,
            ToCharacterId = request.ToCharacterId,
            Type = request.Type,
            CreatedAt = DateTime.UtcNow
        };

        _db.CharacterInteractions.Add(interaction);
        await _db.SaveChangesAsync();

        if (request.Type == InteractionType.Dislike)
            return new MatchResultResponse { IsMatch = false };

        var reverseLikeExists = await _db.CharacterInteractions
            .AnyAsync(x =>
                x.FromCharacterId == request.ToCharacterId &&
                x.ToCharacterId == request.FromCharacterId &&
                x.Type == InteractionType.Like);

        if (!reverseLikeExists)
            return new MatchResultResponse { IsMatch = false };

        var (aId, bId) = Order(request.FromCharacterId, request.ToCharacterId);

        var existingMatch = await _db.CharacterMatches
            .FirstOrDefaultAsync(m => m.CharacterAId == aId && m.CharacterBId == bId);

        if (existingMatch != null)
        {
            return BuildSenderPayload(existingMatch.Id, fromChar, toChar, fromChar.UserGame.Game.Name, existingMatch.MatchedAt);
        }

        var match = new CharacterMatch
        {
            Id = Guid.NewGuid(),
            CharacterAId = aId,
            CharacterBId = bId,
            MatchedAt = DateTime.UtcNow
        };

        _db.CharacterMatches.Add(match);
        await _db.SaveChangesAsync();

        await _notifications.InsertForMatchAsync(match.Id, userId, recipientUserId);

        var recipientPayload = BuildRecipientPayload(match.Id, fromChar, toChar, fromChar.UserGame.Game.Name, match.MatchedAt);
        await _hub.Clients.User(recipientUserId.ToString())
            .SendAsync("NewMatch", recipientPayload);

        return BuildSenderPayload(match.Id, fromChar, toChar, fromChar.UserGame.Game.Name, match.MatchedAt);
    }

    public async Task<List<DiscoverCharacterResponse>> GetPendingLikesAsync(Guid characterId, Guid userId)
    {
        var ownsCharacter = await _db.Characters
            .Include(c => c.UserGame)
            .AnyAsync(c => c.Id == characterId && c.UserGame.UserId == userId);

        if (!ownsCharacter)
            throw new UnauthorizedAccessException("Character does not belong to the authenticated user");

        var iAlreadyRespondedTo = await _db.CharacterInteractions
            .Where(i => i.FromCharacterId == characterId)
            .Select(i => i.ToCharacterId)
            .ToListAsync();

        var pendingLikerIds = await _db.CharacterInteractions
            .Where(i =>
                i.ToCharacterId == characterId &&
                i.Type == InteractionType.Like &&
                !iAlreadyRespondedTo.Contains(i.FromCharacterId))
            .Select(i => i.FromCharacterId)
            .ToListAsync();

        return await _db.Characters
            .Include(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
            .Where(c => pendingLikerIds.Contains(c.Id))
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

    private static MatchResultResponse BuildSenderPayload(
        Guid matchId, Character fromChar, Character toChar, string gameName, DateTime matchedAt) => new()
    {
        IsMatch = true,
        MatchId = matchId,
        MyCharacter = new MatchCharacterPayload { Id = fromChar.Id, Name = fromChar.Name, ImageUrl = fromChar.ImageUrl },
        TheirCharacter = new MatchCharacterPayload { Id = toChar.Id, Name = toChar.Name, ImageUrl = toChar.ImageUrl },
        GameName = gameName,
        MatchedAt = matchedAt
    };

    private static MatchResultResponse BuildRecipientPayload(
        Guid matchId, Character fromChar, Character toChar, string gameName, DateTime matchedAt) => new()
    {
        IsMatch = true,
        MatchId = matchId,
        MyCharacter = new MatchCharacterPayload { Id = toChar.Id, Name = toChar.Name, ImageUrl = toChar.ImageUrl },
        TheirCharacter = new MatchCharacterPayload { Id = fromChar.Id, Name = fromChar.Name, ImageUrl = fromChar.ImageUrl },
        GameName = gameName,
        MatchedAt = matchedAt
    };

    private static (Guid, Guid) Order(Guid a, Guid b)
        => a.CompareTo(b) < 0 ? (a, b) : (b, a);
}
