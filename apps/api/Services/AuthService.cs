using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PartyUp.Api.Models;
using PartyUp.Api.Infrastructure.Data;

public class AuthService : IAuthService
{
  private readonly AppDbContext _context;

  public AuthService(AppDbContext context)
  {
    _context = context;
  }

  public async Task<User?> Register(string username, string password)
  {
    var exists = await _context.Users.AnyAsync(x => x.Username == username);
    if (exists) return null;

    var user = new User
    {
      Username = username,
      PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    return user;
  }

  public async Task<string?> Login(string username, string password, IConfiguration config)
  {
    var user = await _context.Users.FirstOrDefaultAsync(x => x.Username == username);
    if (user == null) return null;

    var valid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
    if (!valid) return null;

    return GenerateJwt(user, config);
  }
  private string GenerateJwt(User user, IConfiguration config)
  {
    var key = new SymmetricSecurityKey(
      Encoding.UTF8.GetBytes(config["Jwt:key"]!)
    );

    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var claims = new[]
    {
      new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
      new Claim(ClaimTypes.Name, user.Username)
    };

    var token = new JwtSecurityToken(
      claims: claims,
      expires: DateTime.UtcNow.AddHours(2),
      signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
  }
}
