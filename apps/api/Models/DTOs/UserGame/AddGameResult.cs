namespace PartyUp.Api.Models.DTOs.UserGame;

public class AddGameResult
{
    public PartyUp.Api.Models.UserGame UserGame { get; set; } = null!;
    public bool Redirected { get; set; }
    public string? Message { get; set; }
}
