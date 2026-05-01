using PartyUp.Api.Models;

public static class UserFactory
{
  private static int _counter = 1;

  public static User Create()
  {
    var id = _counter++;

    return new User
    {
      Id = Guid.NewGuid(),
      PasswordHash = $"user{id}password",
      Username = $"user{id}"
    };
  }
}
