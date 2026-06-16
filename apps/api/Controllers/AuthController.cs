using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PartyUp.Api.Models.DTOs.Auth;
using System.Security.Claims;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
  private readonly IAuthService _auth;
  private readonly IProfileService _profileService;

  public AuthController(IAuthService auth, IProfileService profileService)
  {
    _auth = auth;
    _profileService = profileService;
  }

  [EnableRateLimiting("auth")]
  [HttpPost("register")]
  public async Task<IActionResult> Register(RegisterRequest request)
  {
    var user = await _auth.Register(request.Email, request.Password);
    if (user == null)
      return BadRequest("Email already registered");

    var token = await _auth.Login(request.Email, request.Password);
    return Ok(new AuthResponse { Token = token!, Email = user.Email });
  }

  [EnableRateLimiting("auth")]
  [HttpPost("login")]
  public async Task<IActionResult> Login(LoginRequest request)
  {
    var token = await _auth.Login(request.Email, request.Password);
    if (token == null)
      return Unauthorized();

    return Ok(new AuthResponse { Token = token, Email = request.Email });
  }

  [Authorize]
  [HttpGet("me")]
  public async Task<IActionResult> Me()
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var user = await _auth.GetByIdAsync(userId);
    if (user == null) return Unauthorized();

    var profile = await _profileService.GetProfileAsync(userId);
    return Ok(new { id = user.Id, email = user.Email, profile });
  }

  [Authorize]
  [EnableRateLimiting("auth")]
  [HttpPut("password")]
  public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var success = await _auth.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
    if (!success)
      return BadRequest("Current password is incorrect");

    return Ok();
  }
}
