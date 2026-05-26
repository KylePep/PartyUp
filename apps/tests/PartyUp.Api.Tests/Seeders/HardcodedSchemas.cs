using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Tests.Seeders;

public static class HardcodedSchemas
{
    public static List<GameFieldDefinition> ForEso(Guid gameId) =>
    [
        new()
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            Key = "alliance",
            Label = "Alliance",
            Type = FieldType.Select,
            Options = ["Aldmeri Dominion", "Daggerfall Covenant", "Ebonheart Pact"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = 1
        },
        new()
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            Key = "server",
            Label = "Server",
            Type = FieldType.Select,
            Options = ["NA", "EU", "PC/PS/Xbox"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = 2
        },
        new()
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            Key = "cpLevel",
            Label = "Champion Points",
            Type = FieldType.Select,
            Options = ["0-300", "300-600", "600-1000", "1000-1600", "1600+"],
            IsFilterable = true,
            IsRequired = false,
            SortOrder = 3
        },
        new()
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            Key = "role",
            Label = "Role",
            Type = FieldType.Select,
            Options = ["Tank", "Healer", "DPS", "Support"],
            IsFilterable = true,
            IsRequired = false,
            SortOrder = 4
        }
    ];

    public static List<GameFieldDefinition> ForValiant(Guid gameId) =>
    [
        new()
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            Key = "rank",
            Label = "Rank",
            Type = FieldType.Select,
            Options = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = 1
        },
        new()
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            Key = "role",
            Label = "Preferred Role",
            Type = FieldType.Select,
            Options = ["Duelist", "Initiator", "Controller", "Sentinel", "Flex"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = 2
        },
        new()
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            Key = "region",
            Label = "Region",
            Type = FieldType.Select,
            Options = ["NA", "EU", "APAC", "LATAM", "KR"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = 3
        }
    ];
}
