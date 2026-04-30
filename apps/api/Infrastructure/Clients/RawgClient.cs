using PartyUp.Api.Contracts.Rawg;
using PartyUp.Api.Domain.Contracts.Rawg;
using System.Web;

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


  public async Task<List<RawgGame>> GetGames(
      string query = "",
      int page = 1,
      List<string>? includeTags = null,
      List<string>? excludeTags = null)
  {
    var key = _config["Rawg:ApiKey"];

    if (string.IsNullOrEmpty(key))
      throw new Exception("RAWG API key missing");

    var qs = HttpUtility.ParseQueryString(string.Empty);

    qs["key"] = key;
    qs["page"] = page.ToString();
    qs["page_size"] = "20";

    if (!string.IsNullOrWhiteSpace(query))
      qs["search"] = query;

    if (includeTags?.Any() == true)
      qs["tags"] = string.Join(",", includeTags);

    if (excludeTags?.Any() == true)
      qs["exclude_tags"] = string.Join(",", excludeTags);

    var url = $"https://api.rawg.io/api/games?{qs}";

    var response = await _http.GetFromJsonAsync<RawgResponse>(url);

    return response?.Results ?? new List<RawgGame>();
  }

  public async Task<RawgGameDetailed?> GetGameById(int id)
  {
    var key = _config["Rawg:ApiKey"];
    if (string.IsNullOrEmpty(key))
      throw new Exception("RAWG API key missing");

    var url = $"https://api.rawg.io/api/games/{id}?key={key}";

    var response = await _http.GetFromJsonAsync<RawgGameDetailed>(url);

    return response;
  }
}