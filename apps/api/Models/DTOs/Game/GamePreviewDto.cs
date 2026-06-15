namespace PartyUp.Api.Models.DTOs.Game;

public class GamePreviewDto
{
    public int ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int RealmCount { get; set; }
}
