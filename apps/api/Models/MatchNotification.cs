using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Models;

public class MatchNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;
    public Guid MatchId { get; set; }
    public CharacterMatch Match { get; set; } = default!;
    public NotificationType Type { get; set; }
    public DateTime? ViewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
