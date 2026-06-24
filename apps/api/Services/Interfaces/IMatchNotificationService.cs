namespace PartyUp.Api.Services.Interfaces;

public interface IMatchNotificationService
{
    Task InsertForMatchAsync(Guid matchId, Guid senderUserId, Guid recipientUserId);
    Task MarkViewedAsync(Guid matchId, Guid userId);
    Task<Dictionary<Guid, int>> GetNewMatchCountsByUserGameAsync(Guid userId, IEnumerable<Guid> userGameIds);
    Task<HashSet<Guid>> GetCharacterIdsWithNewMatchAsync(Guid userId, IEnumerable<Guid> characterIds);
    Task<HashSet<Guid>> GetNewMatchIdsAsync(Guid userId, IEnumerable<Guid> matchIds);
    Task<bool> HasUnreadAsync(Guid userId);
}
