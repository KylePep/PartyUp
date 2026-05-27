using System.Net;
using System.Text;
using System.Web;

namespace PartyUp.Api.Tests.Infrastructure;

internal sealed class FakeRawgHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri!.AbsolutePath.TrimEnd('/');
        var segments = path.Split('/');
        string json;

        // /api/games/{id}/parent-games
        if (segments.Length >= 2 && segments[^1] == "parent-games"
            && int.TryParse(segments[^2], out var parentOfId))
        {
            // Game 91001 is an addition of game 91000
            json = parentOfId == 91001
                ? """{"count":1,"results":[{"id":91000,"name":"Game 91000","background_image":null}]}"""
                : """{"count":0,"results":[]}""";
        }
        // /api/games/{id}
        else if (int.TryParse(segments[^1], out var id))
        {
            // Game 91001 has parents_count=1; all others have parents_count=0.
            // Real RAWG never populates parent_game inline — parents_count is the signal.
            var parentsCount = id == 91001 ? 1 : 0;
            json = $$"""{"id":{{id}},"name":"Game {{id}}","description":"","background_image":null,"website":null,"rating":4.0,"platforms":[],"parents_count":{{parentsCount}}}""";
        }
        // /api/games  (search)
        else
        {
            var queryParams = HttpUtility.ParseQueryString(request.RequestUri.Query);
            var searchTerm = queryParams["search"];
            json = searchTerm == "testgame"
                ? """{"count":1,"results":[{"id":91000,"name":"Game 91000","background_image":null}]}"""
                : """{"count":0,"results":[]}""";
        }

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });
    }
}
