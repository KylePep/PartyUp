using PartyUp.Api.Models;

public interface IAuthService
{
  Task<User?> Register(string username, string password);
  Task<string?> Login(string username, string password, IConfiguration config);
}
