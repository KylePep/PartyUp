namespace PartyUp.Api.Models.DTOs.Profile;

public class UpdatePreferencesRequest
{
    public bool? DarkMode { get; set; }
    public bool? NotificationsEnabled { get; set; }
}
