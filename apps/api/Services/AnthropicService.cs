using System.Net.Http.Json;
using System.Text.Json;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class AnthropicService : IAnthropicService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public AnthropicService(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _http = httpClientFactory.CreateClient("anthropic");
        _apiKey = config["Anthropic:ApiKey"]
            ?? throw new InvalidOperationException("Anthropic:ApiKey is not configured.");
    }

    public async Task<List<GameFieldDefinitionDto>> GenerateFieldDefinitionsAsync(Game game)
    {
        const string systemPrompt = """
            You are an expert multiplayer matchmaking designer specializing in online games, MMORPGs, competitive games, and co-op games.
            Your task is to generate structured player profile fields used to match compatible teammates.

            Rules:
            - Return ONLY a valid JSON array. No markdown. No explanation.
            - Prioritize fields that meaningfully affect matchmaking compatibility.
            - Prefer structured enumerable fields over free text.
            - For Select and MultiSelect fields, list ALL available options exhaustively — do not truncate or summarize.
            - Use only officially recognized in-game terminology. Do not invent fake game systems or fake terms.

            Exclude these fields — they are already collected elsewhere in the app:
            - Platform, Language, Time zone, Voice chat, Play schedule / active times

            Allowed field types: Select, MultiSelect, Text

            For MMORPGs, consider: server/region, faction/alliance, class/job, role, PvE vs PvP preference, guild focus, experience level, build/playstyle, raid or trial participation.
            For competitive games, consider: rank, main role, preferred mode, agent or character pool.
            For co-op games, consider: difficulty preference, build archetype, playstyle, experience level.
            """;

        var userPrompt = $"""
            Game: {game.Name}
            Description: {game.Description ?? "N/A"}
            Platforms: {string.Join(", ", game.Platforms)}

            Return a JSON array where each element has these fields:
            key (string, camelCase identifier), label (string, display name),
            type (one of: Select, MultiSelect, Text), options (array of strings, empty for Text),
            isFilterable (bool), isRequired (bool), sortOrder (int starting at 1).
            """;

        var body = new
        {
            model = "claude-haiku-4-5-20251001",
            max_tokens = 1024,
            system = systemPrompt,
            messages = new[] { new { role = "user", content = userPrompt } }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("x-api-key", _apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var raw = await response.Content.ReadAsStringAsync();
        var parsed = JsonSerializer.Deserialize<AnthropicResponse>(raw, JsonOpts)
            ?? throw new InvalidOperationException("Empty response from Anthropic.");

        var text = parsed.Content.FirstOrDefault()?.Text?.Trim()
            ?? throw new InvalidOperationException("No text content in Anthropic response.");

        // Strip markdown fences if Claude includes them
        var start = text.IndexOf('[');
        var end = text.LastIndexOf(']');
        if (start >= 0 && end > start)
            text = text[start..(end + 1)];

        return JsonSerializer.Deserialize<List<GameFieldDefinitionDto>>(text, JsonOpts)
            ?? throw new InvalidOperationException("Failed to deserialize field definitions.");
    }

    private sealed class AnthropicResponse
    {
        public List<AnthropicContent> Content { get; set; } = [];
    }

    private sealed class AnthropicContent
    {
        public string Type { get; set; } = "";
        public string Text { get; set; } = "";
    }
}
