using System.Net;
using System.Text;

namespace PartyUp.Api.Tests.Infrastructure;

internal sealed class FakeRawgHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var segments = request.RequestUri!.AbsolutePath.TrimEnd('/').Split('/');
        string json;

        if (int.TryParse(segments[^1], out var id))
        {
            json = $$"""{"id":{{id}},"name":"Test Game {{id}}","description":"","background_image":null,"website":null,"rating":4.0,"platforms":[]}""";
        }
        else
        {
            json = """{"count":0,"results":[]}""";
        }

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });
    }
}
