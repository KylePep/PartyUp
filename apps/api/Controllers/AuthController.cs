using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
  private readonly AuthService _auth;

  public AuthController(AuthService auth)
  {
    _auth = auth;
  }

  [HttpPost("register")]
  public async Task<IActionResult> Register(RegisterRequest request)
  {
    var user = await _auth.Register(request.Username, request.Password);

    if (user == null)
      return BadRequest("Username already exists");

    return Ok(user);
  }

  [HttpPost("login")]
  public async Task<IActionResult> Login(LoginRequest request, IConfiguration config)
  {
    var token = await _auth.Login(request.Username, request.Password, config);

    if (token == null)
      return Unauthorized();

    return Ok(new { token });
  }
}