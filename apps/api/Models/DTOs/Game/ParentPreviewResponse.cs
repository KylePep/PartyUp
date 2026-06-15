namespace PartyUp.Api.Models.DTOs.Game;

public class ParentPreviewResponse
{
    public GamePreviewDto SelectedGame { get; set; } = null!;
    public GamePreviewDto? ParentGame { get; set; }
}
