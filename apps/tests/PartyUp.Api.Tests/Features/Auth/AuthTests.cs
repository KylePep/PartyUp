using System.Net.Http.Json;
using PartyUp.Api.Tests.Factories;

public class AuthTests : IClassFixture<ApiFactory>
{
  private readonly HttpClient _client;

  public AuthTests(ApiFactory factory)
  {
    _client = factory.CreateClient();
  }

  [Fact]
  public async Task Register_then_login_should_return_success()
  {
    var register = new
    {
      username = "testuser",
      passwordHash = "Password123!"
    };

    var regResponse = await _client.PostAsJsonAsync("/api/auth/register", register);
    regResponse.EnsureSuccessStatusCode();

    var login = new
    {
      username = "testuser",
      passwordHash = "Password123!"
    };

    var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", login);
    loginResponse.EnsureSuccessStatusCode();
  }
}
