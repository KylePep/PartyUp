using PartyUp.Api.Domain.Models.Rawg;

namespace PartyUp.Api.Infrastructure.Clients;

public class RawgClient
{
  private readonly HttpClient _http;
  private readonly IConfiguration _config;

  public RawgClient(HttpClient http, IConfiguration config)
  {
    _http = http;
    _config = config;
  }

  public async Task<List<RawgGame>> GetGames(string query = "", int page = 1)
  {
    var key = _config["Rawg:ApiKey"];
    if (string.IsNullOrEmpty(key))
      throw new Exception("RAWG API key missing");

    var url = $"https://api.rawg.io/api/games?key={key}&page={page}&page_size=20&search={query}";

    var response = await _http.GetFromJsonAsync<RawgResponse>(url);

    return response?.Results ?? new List<RawgGame>();
  }
}