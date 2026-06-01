using System.Net;
using System.Text;

namespace PartyUp.Api.Tests.Infrastructure;

public class FakeAnthropicHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        const string json = """
        {
            "content": [{
                "type": "text",
                "text": "[{\"key\":\"server\",\"label\":\"Server\",\"type\":\"Select\",\"options\":[\"NA\",\"EU\"],\"isFilterable\":true,\"isRequired\":true,\"sortOrder\":1,\"commonField\":\"server_slot\"},{\"key\":\"alliance\",\"label\":\"Alliance\",\"type\":\"Select\",\"options\":[\"Ebonheart Pact\",\"Aldmeri Dominion\",\"Daggerfall Covenant\"],\"isFilterable\":true,\"isRequired\":true,\"sortOrder\":2,\"commonField\":\"faction_slot\"}]"
            }]
        }
        """;

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });
    }
}
