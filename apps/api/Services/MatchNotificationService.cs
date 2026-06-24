using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class MatchNotificationService : IMatchNotificationService
{
    private readonly AppDbContext _db;

    public MatchNotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task InsertForMatchAsync(Guid matchId, Guid senderUserId, Guid recipientUserId)
    {
        _db.MatchNotifications.AddRange(
            new MatchNotification { Id = Guid.NewGuid(), UserId = senderUserId, MatchId = matchId, Type = NotificationType.NewMatch, CreatedAt = DateTime.UtcNow },
            new MatchNotification { Id = Guid.NewGuid(), UserId = recipientUserId, MatchId = matchId, Type = NotificationType.NewMatch, CreatedAt = DateTime.UtcNow }
        );
        await _db.SaveChangesAsync();
    }

    public async Task MarkViewedAsync(Guid matchId, Guid userId)
    {
        var notifications = await _db.MatchNotifications
            .Where(n => n.MatchId == matchId && n.UserId == userId && n.ViewedAt == null)
            .ToListAsync();

        if (notifications.Count == 0) return;

        var now = DateTime.UtcNow;
        foreach (var n in notifications)
            n.ViewedAt = now;

        await _db.SaveChangesAsync();
    }

    public async Task<Dictionary<Guid, int>> GetNewMatchCountsByUserGameAsync(Guid userId, IEnumerable<Guid> userGameIds)
    {
        var ids = userGameIds.ToList();
        var newMatchIds = await _db.MatchNotifications
            .Where(n => n.UserId == userId && n.ViewedAt == null)
            .Select(n => n.MatchId)
            .Distinct()
            .ToListAsync();

        return await _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame)
            .Where(m =>
                newMatchIds.Contains(m.Id) &&
                (
                    (m.CharacterA.UserGame.UserId == userId && ids.Contains(m.CharacterA.UserGameId)) ||
                    (m.CharacterB.UserGame.UserId == userId && ids.Contains(m.CharacterB.UserGameId))
                ))
            .Select(m => m.CharacterA.UserGame.UserId == userId ? m.CharacterA.UserGameId : m.CharacterB.UserGameId)
            .GroupBy(id => id)
            .ToDictionaryAsync(g => g.Key, g => g.Count());
    }

    public async Task<HashSet<Guid>> GetCharacterIdsWithNewMatchAsync(Guid userId, IEnumerable<Guid> characterIds)
    {
        var ids = characterIds.ToList();
        var newMatchIds = await _db.MatchNotifications
            .Where(n => n.UserId == userId && n.ViewedAt == null)
            .Select(n => n.MatchId)
            .Distinct()
            .ToListAsync();

        var result = await _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame)
            .Where(m =>
                newMatchIds.Contains(m.Id) &&
                (
                    (m.CharacterA.UserGame.UserId == userId && ids.Contains(m.CharacterAId)) ||
                    (m.CharacterB.UserGame.UserId == userId && ids.Contains(m.CharacterBId))
                ))
            .Select(m => m.CharacterA.UserGame.UserId == userId ? m.CharacterAId : m.CharacterBId)
            .ToListAsync();

        return result.ToHashSet();
    }

    public async Task<HashSet<Guid>> GetNewMatchIdsAsync(Guid userId, IEnumerable<Guid> matchIds)
    {
        var ids = matchIds.ToList();
        var result = await _db.MatchNotifications
            .Where(n =>
                n.UserId == userId &&
                n.ViewedAt == null &&
                ids.Contains(n.MatchId))
            .Select(n => n.MatchId)
            .Distinct()
            .ToListAsync();
        return result.ToHashSet();
    }

    public async Task<bool> HasUnreadAsync(Guid userId) =>
        await _db.MatchNotifications.AnyAsync(n => n.UserId == userId && n.ViewedAt == null);
}
