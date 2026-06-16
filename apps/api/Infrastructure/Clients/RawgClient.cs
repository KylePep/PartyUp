using PartyUp.Api.Models.DTOs.Rawg;
using System.Web;

namespace PartyUp.Api.Infrastructure.Clients;

public class RawgClient
{
  private readonly HttpClient _http;
  private readonly IConfiguration _config;

  private const int PageSize = 20;

  public RawgClient(HttpClient http, IConfiguration config)
  {
    _http = http;
    _config = config;
  }

  public async Task<RawgResponse> GetGames(
      string q, int page, List<int>? genres, bool? exclude_additions, List<string>? tags)
  {
    var key = _config["Rawg:ApiKey"];
    if (string.IsNullOrEmpty(key))
      throw new InvalidOperationException("RAWG API key missing");

    var qs = HttpUtility.ParseQueryString(string.Empty);

    qs["key"] = key;
    qs["page"] = page.ToString();
    qs["page_size"] = PageSize.ToString();

    if (!string.IsNullOrWhiteSpace(q))
      qs["search"] = q;

    if (tags?.Any() == true)
      qs["tags"] = string.Join(",", tags);

    if (genres?.Any() == true)
      qs["genres"] = string.Join(",", genres);

    if (exclude_additions == true)
      qs["exclude_additions"] = "true";

    var url = $"https://api.rawg.io/api/games?{qs}";

    return await _http.GetFromJsonAsync<RawgResponse>(url) ?? new RawgResponse();
  }

  public async Task<RawgGameDetailed?> GetGameById(int id)
  {
    var key = _config["Rawg:ApiKey"];
    if (string.IsNullOrEmpty(key))
      throw new Exception("RAWG API key missing");

    var url = $"https://api.rawg.io/api/games/{id}?key={key}";

    return await _http.GetFromJsonAsync<RawgGameDetailed>(url);
  }

  public async Task<RawgResponse?> GetParentGames(int id)
  {
    var key = _config["Rawg:ApiKey"];
    if (string.IsNullOrEmpty(key))
      throw new Exception("RAWG API key missing");

    var url = $"https://api.rawg.io/api/games/{id}/parent-games?key={key}";

    return await _http.GetFromJsonAsync<RawgResponse>(url);
  }
}
