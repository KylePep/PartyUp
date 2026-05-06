namespace PartyUp.Api.Models.DTOs.Auth;

public class AuthResponse
{
  public string Token { get; set; } = string.Empty;
  public string Username { get; set; } = string.Empty;
}
