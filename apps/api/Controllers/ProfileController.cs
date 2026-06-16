using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.Profile;
using System.Security.Claims;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        var profile = await _profileService.GetProfileAsync(userId);
        if (profile == null) return NotFound();
        return Ok(profile);
    }

    [HttpPatch]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        var (profile, emailConflict) = await _profileService.UpdateProfileAsync(userId, request);
        if (emailConflict) return BadRequest("Email already registered");
        if (profile == null) return NotFound();
        return Ok(profile);
    }

    [HttpPatch("preferences")]
    public async Task<IActionResult> UpdatePreferences(UpdatePreferencesRequest request)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        var preferences = await _profileService.UpdatePreferencesAsync(userId, request);
        if (preferences == null) return NotFound();
        return Ok(preferences);
    }
}
