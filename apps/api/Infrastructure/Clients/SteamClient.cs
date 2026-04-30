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

// Steam response: {"response":{"game_count":2,"games":[{"appid":219640,"name":"Chivalry: Medieval Warfare","playtime_forever":208,"img_icon_url":"d4628be29b7e97d93a3404870dfe79642b90b907","has_community_visible_stats":true,"playtime_windows_forever":0,"playtime_mac_forever":0,"playtime_linux_forever":0,"playtime_deck_forever":0,"rtime_last_played":1397926125,"content_descriptorids":[2,5],"playtime_disconnected":0},{"appid":335240,"name":"Transformice","playtime_2weeks":7,"playtime_forever":7,"img_icon_url":"f1227d595d6bb3d9624ebdf7228ae68fd0c7dc29","has_community_visible_stats":true,"playtime_windows_forever":7,"playtime_mac_forever":0,"playtime_linux_forever":0,"playtime_deck_forever":0,"rtime_last_played":1777432141,"playtime_disconnected":0}]}}