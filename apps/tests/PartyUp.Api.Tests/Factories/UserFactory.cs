using PartyUp.Api.Models;

namespace PartyUp.Api.Tests.Factories;

public static class UserFactory
{
  public static User Create(
    string username = "testuser")
  {
    return new User
    {
      Username = username,
      PasswordHash = "hash"
    };
  }
}
