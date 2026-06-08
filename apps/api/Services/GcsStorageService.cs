using Google.Cloud.Storage.V1;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class GcsStorageService : IGcsStorageService
{
    private readonly StorageClient _client;
    private readonly string _bucketName;

    public GcsStorageService(IConfiguration config)
    {
        _bucketName = config["GoogleCloudStorage:BucketName"]
            ?? throw new InvalidOperationException("GoogleCloudStorage:BucketName is not configured.");
        _client = StorageClient.Create();
    }

    public async Task<string> UploadAsync(Stream stream, string contentType, string objectName)
    {
        await _client.UploadObjectAsync(_bucketName, objectName, contentType, stream);
        return $"https://storage.googleapis.com/{_bucketName}/{objectName}";
    }

    public async Task DeleteByUrlAsync(string url)
    {
        var prefix = $"https://storage.googleapis.com/{_bucketName}/";
        if (!url.StartsWith(prefix, StringComparison.Ordinal)) return;
        var objectName = url[prefix.Length..];
        await _client.DeleteObjectAsync(_bucketName, objectName);
    }
}
