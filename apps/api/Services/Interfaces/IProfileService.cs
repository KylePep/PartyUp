using PartyUp.Api.Models.DTOs.Profile;

public interface IProfileService
{
    Task<ProfileResponse?> GetProfileAsync(Guid userId);
    Task<(ProfileResponse? Profile, bool EmailConflict)> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<PreferencesResponse?> UpdatePreferencesAsync(Guid userId, UpdatePreferencesRequest request);
}
