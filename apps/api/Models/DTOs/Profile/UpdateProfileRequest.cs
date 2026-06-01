using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Profile;

public class UpdateProfileRequest
{
    [EmailAddress]
    [StringLength(254)]
    public string? Email { get; set; }

    [StringLength(50)]
    public string? DisplayName { get; set; }
}
