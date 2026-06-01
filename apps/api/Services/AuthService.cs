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

  public async Task<string?> Login(string email, string password, IConfiguration config)
  {
    var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == email);
    if (user == null) return null;

    var valid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
    if (!valid) return null;

    return GenerateJwt(user, config);
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

  private string GenerateJwt(User user, IConfiguration config)
  {
    var key = new SymmetricSecurityKey(
      Encoding.UTF8.GetBytes(config["Jwt:key"]!)
    );

    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var claims = new[]
    {
      new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
      new Claim(ClaimTypes.Name, user.Email)
    };

    var token = new JwtSecurityToken(
      issuer: config["Jwt:Issuer"],
      audience: config["Jwt:Audience"],
      claims: claims,
      expires: DateTime.UtcNow.AddHours(2),
      signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
  }
}
