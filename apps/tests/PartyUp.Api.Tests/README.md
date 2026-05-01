Reset DB manually when needed:

docker compose down -v
docker compose up -d


Apply migrations:

dotnet ef database update



