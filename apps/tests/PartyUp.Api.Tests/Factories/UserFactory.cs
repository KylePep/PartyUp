using PartyUp.Api.Models;

namespace PartyUp.Api.Tests.Factories;

public static class UserFactory
{
  public static User Create(
    string email = "testuser@example.com")
  {
    return new User
    {
      Email = email,
      PasswordHash = "hash"
    };
  }
}
