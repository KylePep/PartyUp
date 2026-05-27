using System.Net;
using System.Text;
using System.Web;

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
            // Game 91001 is an addition of game 91000
            var parentJson = id == 91001
                ? ""","parent_game":{"id":91000,"name":"Game 91000"}"""
                : "";
            json = $$"""{"id":{{id}},"name":"Game {{id}}","description":"","background_image":null,"website":null,"rating":4.0,"platforms":[]{{parentJson}}}""";
        }
        else
        {
            var queryParams = HttpUtility.ParseQueryString(request.RequestUri.Query);
            var searchTerm = queryParams["search"];
            if (searchTerm == "testgame")
                json = """{"count":1,"results":[{"id":91000,"name":"Game 91000","background_image":null}]}""";
            else
                json = """{"count":0,"results":[]}""";
        }

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });
    }
}
