using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterFieldValueRequest
{
    [Required]
    public Guid FieldDefinitionId { get; set; }

    [Required]
    [StringLength(500)]
    public string Value { get; set; } = default!;
}
