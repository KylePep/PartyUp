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
  private readonly IConfiguration _config;

  public AuthService(AppDbContext context, IConfiguration config)
  {
    _context = context;
    _config = config;
  }

  public async Task<User?> Register(string email, string password)
  {
    var exists = await _context.Users.AnyAsync(x => x.Email == email);
    if (exists) return null;

    var user = new User
    {
      Email = email,
      PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    var profile = new UserProfile { UserId = user.Id };
    _context.UserProfiles.Add(profile);
    await _context.SaveChangesAsync();

    return user;
  }

  public async Task<string?> Login(string email, string password)
  {
    var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == email);
    if (user == null) return null;

    var valid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
    if (!valid) return null;

    return GenerateJwt(user);
  }

  public async Task<User?> GetByIdAsync(Guid userId)
  {
    return await _context.Users.FindAsync(userId);
  }

  public async Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
  {
    var user = await _context.Users.FindAsync(userId);
    if (user == null) return false;

    var valid = BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash);
    if (!valid) return false;

    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
    await _context.SaveChangesAsync();
    return true;
  }

  private string GenerateJwt(User user)
  {
    var key = new SymmetricSecurityKey(
      Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)
    );

    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var claims = new List<Claim>
    {
      new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
      new Claim(ClaimTypes.Name, user.Email)
    };

    if (user.IsAdmin)
      claims.Add(new Claim(ClaimTypes.Role, "Admin"));

    var token = new JwtSecurityToken(
      issuer: _config["Jwt:Issuer"],
      audience: _config["Jwt:Audience"],
      claims: claims,
      expires: DateTime.UtcNow.AddHours(2),
      signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
  }
}
