using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace PartyUp.Api.Tests.Factories;

public class ApiFactory : WebApplicationFactory<Program>
{
}

public class SmokeTests : IClassFixture<ApiFactory>
{
  private readonly HttpClient _client;

  public SmokeTests(ApiFactory factory)
  {
    _client = factory.CreateClient();
  }

  [Fact]
  public async Task Health_check_should_work()
  {
    var response = await _client.GetAsync("/api/users");
    response.EnsureSuccessStatusCode();
  }
}
