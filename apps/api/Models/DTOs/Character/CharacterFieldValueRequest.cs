namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterFieldValueRequest
{
    public Guid FieldDefinitionId { get; set; }
    public string Value { get; set; } = default!;
}
