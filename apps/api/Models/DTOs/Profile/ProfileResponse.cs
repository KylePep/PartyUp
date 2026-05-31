namespace PartyUp.Api.Models.DTOs.Profile;

public class ProfileResponse
{
    public string? DisplayName { get; set; }
    public PreferencesResponse Preferences { get; set; } = new();
}

public class PreferencesResponse
{
    public bool DarkMode { get; set; }
    public bool NotificationsEnabled { get; set; }
}
