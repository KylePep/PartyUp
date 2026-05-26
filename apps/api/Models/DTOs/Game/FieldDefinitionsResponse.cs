namespace PartyUp.Api.Models.DTOs.Game;

public class FieldDefinitionsResponse
{
    public string SchemaStatus { get; set; } = default!;
    public List<GameFieldDefinitionDto> Fields { get; set; } = [];
}
