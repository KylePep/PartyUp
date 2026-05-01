using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace PartyUp.Api.Tests;

public class SmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
  private readonly HttpClient _client;

  public SmokeTests(WebApplicationFactory<Program> factory)
  {
    _client = factory.CreateClient();
  }

  [Fact]
  public async Task Get_Health_ReturnsSuccess()
  {
    var response = await _client.GetAsync("/api/health");

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
  }
}
