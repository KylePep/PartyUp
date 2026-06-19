using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Hubs;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.StickerMessage;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class StickerMessageService : IStickerMessageService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;

    public StickerMessageService(AppDbContext db, IHubContext<NotificationHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task<List<StickerMessageDto>> GetByMatchAsync(Guid matchId, Guid userId)
    {
        var match = await _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match is null ||
            (match.CharacterA.UserGame.UserId != userId &&
             match.CharacterB.UserGame.UserId != userId))
            throw new UnauthorizedAccessException();

        return await _db.StickerMessages
            .Where(s => s.MatchId == matchId)
            .OrderBy(s => s.SentAt)
            .Select(s => new StickerMessageDto
            {
                Id = s.Id,
                MatchId = s.MatchId,
                SenderCharacterId = s.SenderCharacterId,
                Emoji = s.Emoji,
                SentAt = s.SentAt
            })
            .ToListAsync();
    }

    public async Task<StickerMessageDto> SendAsync(Guid matchId, Guid userId, string emoji)
    {
        var match = await _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match is null) throw new KeyNotFoundException();

        var isSenderA = match.CharacterA.UserGame.UserId == userId;
        if (!isSenderA && match.CharacterB.UserGame.UserId != userId)
            throw new UnauthorizedAccessException();

        var senderCharacterId = isSenderA ? match.CharacterAId : match.CharacterBId;
        var senderCharacterName = isSenderA ? match.CharacterA.Name : match.CharacterB.Name;
        var recipientUserId = isSenderA
            ? match.CharacterB.UserGame.UserId
            : match.CharacterA.UserGame.UserId;

        var message = new StickerMessage
        {
            Id = Guid.NewGuid(),
            MatchId = matchId,
            SenderCharacterId = senderCharacterId,
            Emoji = emoji,
            SentAt = DateTime.UtcNow
        };

        _db.StickerMessages.Add(message);

        var notification = await _db.MatchNotifications
            .FirstOrDefaultAsync(n => n.MatchId == matchId && n.UserId == recipientUserId);

        if (notification is not null)
        {
            notification.Type = NotificationType.NewMessage;
            notification.ViewedAt = null;
        }
        else
        {
            _db.MatchNotifications.Add(new MatchNotification
            {
                Id = Guid.NewGuid(),
                UserId = recipientUserId,
                MatchId = matchId,
                Type = NotificationType.NewMessage,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();

        var dto = new StickerMessageDto
        {
            Id = message.Id,
            MatchId = message.MatchId,
            SenderCharacterId = message.SenderCharacterId,
            Emoji = message.Emoji,
            SentAt = message.SentAt
        };

        await _hub.Clients.User(recipientUserId.ToString())
            .SendAsync("NewSticker", new
            {
                id = dto.Id,
                matchId = dto.MatchId,
                senderCharacterId = dto.SenderCharacterId,
                senderCharacterName,
                emoji = dto.Emoji,
                sentAt = dto.SentAt
            });

        return dto;
    }
}
