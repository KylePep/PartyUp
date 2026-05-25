namespace PartyUp.Api.Models;

public class CharacterFieldValue
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CharacterId { get; set; }
    public Guid FieldDefinitionId { get; set; }
    public string Value { get; set; } = default!;

    public GameFieldDefinition FieldDefinition { get; set; } = default!;
}
