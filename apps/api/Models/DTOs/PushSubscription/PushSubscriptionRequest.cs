namespace PartyUp.Api.Models.DTOs.PushSubscription;

public class PushSubscriptionRequest
{
    public string Endpoint { get; set; } = "";
    public string P256dh { get; set; } = "";
    public string Auth { get; set; } = "";
}
