using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Character;

public class CreateCharacterRequest
{
    [Required]
    public Guid UserGameId { get; set; }

    [Required]
    [StringLength(100)]
    public string Platform { get; set; } = default!;

    [Required]
    [StringLength(100)]
    public string PlatformHandle { get; set; } = default!;

    [Required]
    [StringLength(100)]
    public string Name { get; set; } = default!;

    [StringLength(500)]
    public string? ImageUrl { get; set; }

    [StringLength(500)]
    public string? Bio { get; set; }

    [StringLength(100)]
    public string? TimeZone { get; set; }

    public string[]? ActiveTimes { get; set; }

    public bool? UsesVoiceChat { get; set; }

    public string[]? Languages { get; set; }

    [StringLength(1000)]
    public string? AdditionalNotes { get; set; }

    [StringLength(7)]
    public string? CardBackgroundColor { get; set; }

    public List<CharacterFieldValueRequest> GameFields { get; set; } = [];
}
