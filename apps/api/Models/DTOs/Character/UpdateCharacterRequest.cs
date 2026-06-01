namespace PartyUp.Api.Models.DTOs.Character;

public class UpdateCharacterRequest
{
  public string? Platform { get; set; }
  public string? PlatformHandle { get; set; }
  public string Name { get; set; } = string.Empty;
  public string? ImageUrl { get; set; }
  public string? Bio { get; set; }
  public string? TimeZone { get; set; }
  public string[]? ActiveTimes { get; set; }
  public bool? UsesVoiceChat { get; set; }
  public string[]? Languages { get; set; }
  public string? AdditionalNotes { get; set; }
  public List<CharacterFieldValueRequest>? GameFields { get; set; }
}
