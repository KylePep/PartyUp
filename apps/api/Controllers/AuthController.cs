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
    var user = await _auth.Register(request.Username, request.Password);
    if (user == null)
      return BadRequest("Username already exists");

    var token = await _auth.Login(request.Username, request.Password, config);
    return Ok(new AuthResponse { Token = token!, Username = user.Username });
  }

  [EnableRateLimiting("auth")]
  [HttpPost("login")]
  public async Task<IActionResult> Login(LoginRequest request, IConfiguration config)
  {
    var token = await _auth.Login(request.Username, request.Password, config);
    if (token == null)
      return Unauthorized();

    return Ok(new AuthResponse { Token = token, Username = request.Username });
  }

  [Authorize]
  [HttpGet("me")]
  public IActionResult Me()
  {
    var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
    var username = User.FindFirstValue(ClaimTypes.Name);

    if (id == null || username == null)
      return Unauthorized();

    return Ok(new { id, username });
  }
}
