using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PartyUp.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    // Push-only hub — no client-callable methods.
    // Server pushes events via IHubContext<NotificationHub>.
}
