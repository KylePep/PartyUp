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
        const string systemPrompt =
            "You are a gaming expert helping build a multiplayer matchmaking platform. " +
            "Given a game's details, return a JSON array of character field definitions " +
            "that players would use to find compatible teammates. Prioritize fields with " +
            "enumerable options (server region, class, role, faction) over free-text fields. " +
            "IMPORTANT: Do NOT include fields for platform, language, time zone, voice chat, " +
            "or active/play times — those are already collected elsewhere in the app. " +
            "Focus only on game-specific attributes (class, weapon, faction, rank, server, etc.). " +
            "For Select and MultiSelect fields, list ALL currently available options exhaustively — " +
            "do not truncate or summarize. Players need complete option lists to accurately represent their character. " +
            "Return only valid JSON — no explanation, no markdown.";

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
