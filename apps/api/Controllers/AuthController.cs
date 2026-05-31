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

  public AuthController(IAuthService auth)
  {
    _auth = auth;
  }

  [EnableRateLimiting("auth")]
  [HttpPost("register")]
  public async Task<IActionResult> Register(RegisterRequest request, IConfiguration config)
  {
    var user = await _auth.Register(request.Email, request.Password);
    if (user == null)
      return BadRequest("Email already registered");

    var token = await _auth.Login(request.Email, request.Password, config);
    return Ok(new AuthResponse { Token = token!, Email = user.Email });
  }

  [EnableRateLimiting("auth")]
  [HttpPost("login")]
  public async Task<IActionResult> Login(LoginRequest request, IConfiguration config)
  {
    var token = await _auth.Login(request.Email, request.Password, config);
    if (token == null)
      return Unauthorized();

    return Ok(new AuthResponse { Token = token, Email = request.Email });
  }

  [Authorize]
  [HttpGet("me")]
  public async Task<IActionResult> Me()
  {
    var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (idClaim == null) return Unauthorized();

    var userId = Guid.Parse(idClaim);
    var user = await _auth.GetByIdAsync(userId);
    if (user == null) return Unauthorized();

    return Ok(new { id = user.Id, email = user.Email, profile = (object?)null });
  }
}
