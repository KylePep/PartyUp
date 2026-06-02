FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY apps/api/PartyUp.Api.csproj apps/api/
RUN dotnet restore apps/api/PartyUp.Api.csproj

COPY apps/api/ apps/api/
RUN dotnet publish apps/api/PartyUp.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
COPY --from=build /app/publish .
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1
ENTRYPOINT ["dotnet", "PartyUp.Api.dll"]
