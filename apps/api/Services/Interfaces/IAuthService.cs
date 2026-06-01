using PartyUp.Api.Models;

public interface IAuthService
{
  Task<User?> Register(string email, string password);
  Task<string?> Login(string email, string password, IConfiguration config);
  Task<User?> GetByIdAsync(Guid userId);
  Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
}
