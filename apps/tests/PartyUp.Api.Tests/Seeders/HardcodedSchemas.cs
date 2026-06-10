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

    public static List<GameFieldDefinition> ForWow(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "faction", Label = "Faction", Type = FieldType.Select, Options = ["Alliance", "Horde"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "role", Label = "Role", Type = FieldType.Select, Options = ["Tank", "Healer", "DPS"], IsFilterable = true, IsRequired = true, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "content", Label = "Content Focus", Type = FieldType.Select, Options = ["Mythic Raiding", "Mythic+", "PvP", "Casual/Questing"], IsFilterable = true, IsRequired = false, SortOrder = 3 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "version", Label = "Version", Type = FieldType.Select, Options = ["Retail", "Classic Era", "Cataclysm Classic", "Season of Discovery"], IsFilterable = true, IsRequired = false, SortOrder = 4 },
    ];

    public static List<GameFieldDefinition> ForDestiny2(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "class", Label = "Class", Type = FieldType.Select, Options = ["Hunter", "Titan", "Warlock"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "activity", Label = "Preferred Activity", Type = FieldType.Select, Options = ["Raids", "Trials of Osiris", "Dungeons", "Strikes/Nightfalls", "Casual PvP"], IsFilterable = true, IsRequired = true, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "subclass", Label = "Subclass", Type = FieldType.Select, Options = ["Solar", "Arc", "Void", "Strand", "Stasis"], IsFilterable = false, IsRequired = false, SortOrder = 3 },
    ];

    public static List<GameFieldDefinition> ForApex(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "legend", Label = "Main Legend", Type = FieldType.Select, Options = ["Wraith", "Pathfinder", "Bloodhound", "Lifeline", "Gibraltar", "Octane", "Bangalore", "Horizon"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "rank", Label = "Rank", Type = FieldType.Select, Options = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Masters", "Predator"], IsFilterable = true, IsRequired = true, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "region", Label = "Region", Type = FieldType.Select, Options = ["NA", "EU", "APAC", "SA"], IsFilterable = true, IsRequired = false, SortOrder = 3 },
    ];

    public static List<GameFieldDefinition> ForFfxiv(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "role", Label = "Main Role", Type = FieldType.Select, Options = ["Tank", "Healer", "Melee DPS", "Ranged DPS", "Magical DPS"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "datacenter", Label = "Data Center", Type = FieldType.Select, Options = ["NA - Aether", "NA - Primal", "NA - Crystal", "EU - Chaos", "EU - Light", "JP - Elemental", "OC - Materia"], IsFilterable = true, IsRequired = true, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "content", Label = "Content Focus", Type = FieldType.Select, Options = ["Savage Raids", "Ultimate Raids", "Casual/MSQ", "Crafting/Gathering", "Housing/RP"], IsFilterable = true, IsRequired = false, SortOrder = 3 },
    ];

    public static List<GameFieldDefinition> ForGuildWars2(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "profession", Label = "Profession", Type = FieldType.Select, Options = ["Guardian", "Warrior", "Engineer", "Ranger", "Thief", "Elementalist", "Mesmer", "Necromancer", "Revenant"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "mode", Label = "Game Mode", Type = FieldType.Select, Options = ["PvE / Open World", "Fractals / Raids", "PvP (sPvP)", "World vs World"], IsFilterable = true, IsRequired = true, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "region", Label = "Region", Type = FieldType.Select, Options = ["NA", "EU", "OCE"], IsFilterable = false, IsRequired = false, SortOrder = 3 },
    ];

    public static List<GameFieldDefinition> ForMinecraft(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "mode", Label = "Mode", Type = FieldType.Select, Options = ["Survival", "Creative", "Hardcore", "Adventure"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "serverType", Label = "Server Type", Type = FieldType.Select, Options = ["Vanilla SMP", "Modded", "Minigames", "Roleplay", "Solo"], IsFilterable = true, IsRequired = false, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "activity", Label = "Favorite Activity", Type = FieldType.Select, Options = ["Building", "Redstone", "Farming/AFK", "Exploration", "PvP"], IsFilterable = false, IsRequired = false, SortOrder = 3 },
    ];

    public static List<GameFieldDefinition> ForSeaOfThieves(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "role", Label = "Crew Role", Type = FieldType.Select, Options = ["Captain", "Navigator", "Cannoneer", "All-rounder"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "content", Label = "Preferred Content", Type = FieldType.Select, Options = ["Tall Tales / Story", "Hourglass PvP", "Gold Hoarder Runs", "Casual / Chill Sailing"], IsFilterable = true, IsRequired = false, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "region", Label = "Region", Type = FieldType.Select, Options = ["NA", "EU", "OCE"], IsFilterable = false, IsRequired = false, SortOrder = 3 },
    ];

    public static List<GameFieldDefinition> ForLostArk(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "class", Label = "Class", Type = FieldType.Select, Options = ["Berserker", "Paladin", "Gunlancer", "Sorceress", "Bard", "Deathblade", "Gunslinger"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "server", Label = "Server", Type = FieldType.Select, Options = ["NA East", "NA West", "EU Central"], IsFilterable = true, IsRequired = true, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "content", Label = "Content Focus", Type = FieldType.Select, Options = ["Legion Raids", "Guardian Raids", "PvP", "Life Skills / Casual"], IsFilterable = true, IsRequired = false, SortOrder = 3 },
    ];

    public static List<GameFieldDefinition> ForPathOfExile(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "class", Label = "Class", Type = FieldType.Select, Options = ["Witch", "Shadow", "Ranger", "Duelist", "Marauder", "Templar", "Scion"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "league", Label = "League", Type = FieldType.Select, Options = ["Softcore", "Hardcore", "Solo Self-Found", "Hardcore SSF"], IsFilterable = true, IsRequired = true, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "playstyle", Label = "Playstyle", Type = FieldType.Select, Options = ["Meta Build", "Meme/Fun Build", "Speedrun", "Hardcore Pusher"], IsFilterable = false, IsRequired = false, SortOrder = 3 },
    ];

    public static List<GameFieldDefinition> ForDiablo4(Guid gameId) =>
    [
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "class", Label = "Class", Type = FieldType.Select, Options = ["Barbarian", "Necromancer", "Sorcerer", "Druid", "Rogue"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "mode", Label = "Mode", Type = FieldType.Select, Options = ["Softcore Seasonal", "Hardcore Seasonal", "Eternal Realm"], IsFilterable = true, IsRequired = true, SortOrder = 2 },
        new() { Id = Guid.NewGuid(), GameId = gameId, Key = "region", Label = "Region", Type = FieldType.Select, Options = ["NA", "EU", "Asia"], IsFilterable = false, IsRequired = false, SortOrder = 3 },
    ];
}
