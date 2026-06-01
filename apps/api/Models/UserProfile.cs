namespace PartyUp.Api.Models;

public class UserProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string? DisplayName { get; set; }
    public UserPreferences Preferences { get; set; } = new();
}
