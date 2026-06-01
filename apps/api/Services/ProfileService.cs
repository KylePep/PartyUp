using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Profile;

public class ProfileService : IProfileService
{
    private readonly AppDbContext _context;

    public ProfileService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ProfileResponse?> GetProfileAsync(Guid userId)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null) return null;

        return ToResponse(profile);
    }

    public async Task<(ProfileResponse? Profile, bool EmailConflict)> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null) return (null, false);

        if (request.Email != null)
        {
            var emailTaken = await _context.Users
                .AnyAsync(u => u.Email == request.Email && u.Id != userId);
            if (emailTaken) return (null, true);

            var user = await _context.Users.FindAsync(userId);
            if (user != null) user.Email = request.Email;
        }

        if (request.DisplayName != null)
            profile.DisplayName = request.DisplayName;

        await _context.SaveChangesAsync();
        return (ToResponse(profile), false);
    }

    public async Task<PreferencesResponse?> UpdatePreferencesAsync(Guid userId, UpdatePreferencesRequest request)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null) return null;

        profile.Preferences = new UserPreferences
        {
            DarkMode = request.DarkMode ?? profile.Preferences.DarkMode,
            NotificationsEnabled = request.NotificationsEnabled ?? profile.Preferences.NotificationsEnabled
        };

        await _context.SaveChangesAsync();

        return new PreferencesResponse
        {
            DarkMode = profile.Preferences.DarkMode,
            NotificationsEnabled = profile.Preferences.NotificationsEnabled
        };
    }

    private static ProfileResponse ToResponse(UserProfile profile) => new()
    {
        DisplayName = profile.DisplayName,
        Preferences = new PreferencesResponse
        {
            DarkMode = profile.Preferences.DarkMode,
            NotificationsEnabled = profile.Preferences.NotificationsEnabled
        }
    };
}
