namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterFieldValueDto
{
    public Guid FieldDefinitionId { get; set; }
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
    public string Value { get; set; } = default!;
    public string Type { get; set; } = default!;
}
