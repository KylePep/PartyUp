using System.Text.Json;

public class SteamClient
{
  private readonly HttpClient _http;
  private readonly IConfiguration _config;

  private readonly ILogger<SteamClient> _logger;

  public SteamClient(HttpClient http, IConfiguration config, ILogger<SteamClient> logger)
  {
    _http = http;
    _config = config;
    _logger = logger;
  }

  public async Task<SteamOwnedGamesResponse?> GetOwnedGames(string steamId)
  {
    var key = _config["Steam:ApiKey"];
    if (string.IsNullOrEmpty(key))
      throw new Exception("Steam API key missing");

    var url =
    $"https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/" +
    $"?key={key}&steamid={steamId}&include_appinfo=1&include_played_free_games=1";

    var httpResponse = await _http.GetAsync(url);

    var rawJson = await httpResponse.Content.ReadAsStringAsync();

    _logger.LogInformation("Steam response: {Response}", rawJson);

    var result = JsonSerializer.Deserialize<SteamOwnedGamesResponse>(rawJson);

    return result;
  }
}