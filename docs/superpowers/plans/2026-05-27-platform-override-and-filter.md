# Platform Override & Discovery Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick granular platform hardware (e.g., "Xbox One X") when creating a character even when RAWG only lists the base platform, and filter discovery results by platform with game platforms pre-selected.

**Architecture:** Frontend-first — add an `ALL_PLATFORMS` constant, update `IdentityStep` with an inline expand UX, wire `DiscoveryPanel` → `DiscoveryFilters` with new platform multi-select state; then add backend `IN` filter to `DiscoverCharactersAsync`.

**Tech Stack:** React + TypeScript (Vite), ASP.NET Core 8 / EF Core, xUnit integration tests (real DB, no mocks)

---

## File Map

| File | Change |
|---|---|
| `apps/web/src/components/character-wizard/types.ts` | Add `ALL_PLATFORMS` grouped constant + `ALL_PLATFORM_VALUES` flat list |
| `apps/web/src/components/character-wizard/IdentityStep.tsx` | Platform override UX — inline expand section |
| `apps/web/src/api/endpoints/characters.ts` | Update `discoverCharacters` to accept `platforms?: string[]` |
| `apps/web/src/components/DiscoveryFilters.tsx` | Add platform multi-select section with expand/collapse |
| `apps/web/src/components/DiscoveryPanel.tsx` | Add `gamePlatforms` prop + `activePlatforms` state |
| `apps/web/src/pages/RealmPage.tsx` | Pass `userGame.platforms` to `DiscoveryPanel` |
| `apps/api/Services/Interfaces/ICharacterService.cs` | Add `platformFilters` param to `DiscoverCharactersAsync` |
| `apps/api/Services/CharacterService.cs` | Apply `WHERE c.Platform IN (...)` filter |
| `apps/api/Controllers/CharactersController.cs` | Extract `platform` query params before generic filter dict |
| `apps/tests/PartyUp.Api.Tests/Features/Characters/DiscoverFilterTests.cs` | Add 3 platform-filter integration tests |

---

## Task 1: Add ALL_PLATFORMS constant

**Files:**
- Modify: `apps/web/src/components/character-wizard/types.ts`

- [ ] **Step 1: Add the grouped constant after the existing PLATFORMS line**

Open `apps/web/src/components/character-wizard/types.ts` and add after `export const PLATFORMS = [...]`:

```ts
export const ALL_PLATFORMS: { group: string; platforms: string[] }[] = [
  { group: 'PC / Desktop', platforms: ['PC (Windows)', 'Mac', 'Linux', 'Steam Deck'] },
  { group: 'Xbox', platforms: ['Xbox One', 'Xbox One S', 'Xbox One X', 'Xbox Series S', 'Xbox Series X'] },
  { group: 'PlayStation', platforms: ['PS4', 'PS4 Pro', 'PS5', 'PS5 Pro'] },
  { group: 'Nintendo', platforms: ['Nintendo Switch', 'Nintendo Switch Lite', 'Nintendo Switch OLED'] },
  { group: 'Mobile', platforms: ['iOS', 'Android'] },
]

export const ALL_PLATFORM_VALUES = ALL_PLATFORMS.flatMap(g => g.platforms)
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/character-wizard/types.ts
git commit -m "feat: add ALL_PLATFORMS grouped constant"
```

---

## Task 2: IdentityStep platform override UX

**Files:**
- Modify: `apps/web/src/components/character-wizard/IdentityStep.tsx`

- [ ] **Step 1: Replace the file contents entirely**

```tsx
import { useRef, useState } from 'react'
import { Input } from '../ui'
import { ToggleButtonGroup } from '../forms/ToggleButtonGroup'
import { type CharacterFormData, PLATFORMS, ALL_PLATFORMS } from './types'
import { compressImageIfNeeded } from '../../utils/imageCompression'

interface IdentityStepProps {
  data: CharacterFormData
  onChange: (patch: Partial<CharacterFormData>) => void
  platforms?: string[]
}

const toOptions = (arr: string[]) => arr.map(v => ({ value: v, label: v }))

export function IdentityStep({ data, onChange, platforms }: IdentityStepProps) {
  const platformOptions = platforms && platforms.length > 0 ? platforms : PLATFORMS
  const [showAllPlatforms, setShowAllPlatforms] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [compressedNotice, setCompressedNotice] = useState(false)
  const [imageError, setImageError] = useState('')

  // An override is a platform the user chose that isn't in the game's RAWG list
  const isOverride = Boolean(data.platform && !platformOptions.includes(data.platform))

  // Expanded section: exclude platforms already shown in primary list (exact match)
  const primarySet = new Set(platformOptions)
  const expandedGroups = ALL_PLATFORMS.map(group => ({
    ...group,
    platforms: group.platforms.filter(p => !primarySet.has(p)),
  })).filter(g => g.platforms.length > 0)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0] ?? null
    if (!raw) return
    setCompressedNotice(false)
    setImageError('')
    try {
      const { file, wasCompressed } = await compressImageIfNeeded(raw)
      onChange({ imageFile: file, imageUrl: '' })
      setCompressedNotice(wasCompressed)
    } catch {
      setImageError('Could not process this image. Please try a different file.')
    }
  }

  const previewUrl = data.imageFile
    ? URL.createObjectURL(data.imageFile)
    : data.imageUrl || undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Platform *</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <ToggleButtonGroup
            options={toOptions(platformOptions)}
            value={data.platform && !isOverride ? [data.platform] : []}
            multiple={false}
            onChange={vals => onChange({ platform: vals[0] ?? '' })}
          />
          {isOverride && (
            <button
              type="button"
              onClick={() => onChange({ platform: '' })}
              className="px-3 py-1.5 rounded text-xs font-mono border bg-accent text-white border-accent"
              title="Click to clear"
            >
              {data.platform} ×
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAllPlatforms(s => !s)}
          className="text-xs font-mono text-muted hover:text-accent transition-colors mt-1"
        >
          {showAllPlatforms ? '− Hide platforms' : '+ Add platform'}
        </button>
        {showAllPlatforms && (
          <div className="mt-3 flex flex-col gap-4 border border-border rounded p-3 bg-surface-raised">
            {expandedGroups.map(group => (
              <div key={group.group}>
                <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">
                  {group.group}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.platforms.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        onChange({ platform: p })
                        setShowAllPlatforms(false)
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                        data.platform === p
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Input
        label="Platform Handle *"
        placeholder="e.g. KylePep#1234, PSN_Username..."
        value={data.platformHandle}
        onChange={e => onChange({ platformHandle: e.target.value })}
        maxLength={100}
      />

      <Input
        label="Character Name *"
        placeholder="e.g. NightShade, IronFang..."
        value={data.name}
        onChange={e => onChange({ name: e.target.value })}
        maxLength={50}
      />

      <div>
        <p className="text-xs font-mono text-muted uppercase tracking-widest mb-3">Character Image</p>
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Character preview"
            className="w-24 h-24 object-cover rounded mb-3 border border-border"
          />
        )}
        <div className="flex gap-3 items-center flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded text-xs font-mono border border-border text-muted hover:border-accent hover:text-text transition-colors"
          >
            {data.imageFile ? 'Change Image' : 'Upload Image'}
          </button>
          {data.imageFile && (
            <span className="text-xs font-mono text-muted truncate max-w-[180px]">
              {data.imageFile.name}
            </span>
          )}
          {!data.imageFile && (
            <Input
              label=""
              placeholder="or paste image URL"
              value={data.imageUrl}
              onChange={e => onChange({ imageUrl: e.target.value, imageFile: null })}
              maxLength={500}
            />
          )}
        </div>
        {compressedNotice && (
          <p className="text-xs font-mono text-muted mt-2">
            Image was resized to fit the 5 MB limit.
          </p>
        )}
        {imageError && (
          <p className="text-xs font-mono text-danger mt-2">{imageError}</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual smoke test**

```bash
npm run dev
```

Navigate to create a character for a game that only shows PC/Mac. Verify:
- PC/Mac toggle buttons appear
- `+ Add platform` expands the grouped section
- Clicking "Xbox One X" sets it as the selected platform, shows override badge, collapses section
- Clicking the override badge (`Xbox One X ×`) clears the platform
- `canAdvance` still requires a platform to be selected before Next works

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/character-wizard/IdentityStep.tsx
git commit -m "feat: add platform override expand UX to IdentityStep"
```

---

## Task 3: Frontend discovery wiring

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`
- Modify: `apps/web/src/components/DiscoveryFilters.tsx`
- Modify: `apps/web/src/components/DiscoveryPanel.tsx`
- Modify: `apps/web/src/pages/RealmPage.tsx`

- [ ] **Step 1: Update `discoverCharacters` to accept platforms**

In `apps/web/src/api/endpoints/characters.ts`, replace:

```ts
export function discoverCharacters(gameId: string, filters?: Record<string, string>) {
  const qs = new URLSearchParams({ gameId, ...filters });
  return apiGet<DiscoverCharacter[]>(`/characters/discover?${qs.toString()}`);
}
```

With:

```ts
export function discoverCharacters(gameId: string, filters?: Record<string, string>, platforms?: string[]) {
  const qs = new URLSearchParams({ gameId, ...filters });
  platforms?.forEach(p => qs.append('platform', p));
  return apiGet<DiscoverCharacter[]>(`/characters/discover?${qs.toString()}`);
}
```

- [ ] **Step 2: Replace DiscoveryFilters with platform-aware version**

Overwrite `apps/web/src/components/DiscoveryFilters.tsx`:

```tsx
import { useState } from 'react'
import { type GameFieldDefinition } from '../api/endpoints/games'
import { ALL_PLATFORMS } from './character-wizard/types'

interface DiscoveryFiltersProps {
  fields: GameFieldDefinition[]
  activeFilters: Record<string, string>
  onChange: (key: string, value: string) => void
  gamePlatforms: string[]
  activePlatforms: string[]
  onPlatformChange: (platforms: string[]) => void
}

export function DiscoveryFilters({
  fields,
  activeFilters,
  onChange,
  gamePlatforms,
  activePlatforms,
  onPlatformChange,
}: DiscoveryFiltersProps) {
  const [showAllPlatforms, setShowAllPlatforms] = useState(false)
  const filterableFields = fields.filter(f => f.isFilterable && f.type === 'Select')

  function togglePlatform(p: string) {
    if (activePlatforms.includes(p)) {
      onPlatformChange(activePlatforms.filter(x => x !== p))
    } else {
      onPlatformChange([...activePlatforms, p])
    }
  }

  // Platforms active but not in the game's RAWG list — show as extra badges in the primary row
  const overridePlatforms = activePlatforms.filter(p => !gamePlatforms.includes(p))

  // Expanded section: exclude platforms already shown in the primary row
  const primarySet = new Set(gamePlatforms)
  const expandedGroups = ALL_PLATFORMS.map(group => ({
    ...group,
    platforms: group.platforms.filter(p => !primarySet.has(p)),
  })).filter(g => g.platforms.length > 0)

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Platform filter */}
      {gamePlatforms.length > 0 && (
        <div>
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">Platform</p>
          <div className="flex flex-wrap gap-2">
            {gamePlatforms.map(p => {
              const isActive = activePlatforms.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                    isActive
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            {overridePlatforms.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className="px-3 py-1.5 rounded text-xs font-mono border bg-accent text-white border-accent transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAllPlatforms(s => !s)}
            className="text-xs font-mono text-muted hover:text-accent transition-colors mt-2"
          >
            {showAllPlatforms ? '− Show less' : '+ More platforms'}
          </button>
          {showAllPlatforms && (
            <div className="mt-3 flex flex-col gap-4 border border-border rounded p-3 bg-surface-raised">
              {expandedGroups.map(group => (
                <div key={group.group}>
                  <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">
                    {group.group}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.platforms.map(p => {
                      const isActive = activePlatforms.includes(p)
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePlatform(p)}
                          className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                            isActive
                              ? 'bg-accent text-white border-accent'
                              : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI field filters */}
      {filterableFields.map(field => (
        <div key={field.key}>
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-2">
            {field.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {field.options.map(opt => {
              const isActive = activeFilters[field.key] === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(field.key, isActive ? '' : opt)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                    isActive
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Replace DiscoveryPanel with platform-state version**

Overwrite `apps/web/src/components/DiscoveryPanel.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { discoverCharacters, interactWithCharacter, type Character, type DiscoverCharacter } from '../api/endpoints/characters'
import { useFieldDefinitions } from '../hooks/useFieldDefinitions'
import { SwipeCard } from './cards/SwipeCard'
import { DiscoveryFilters } from './DiscoveryFilters'
import { Spinner, EmptyState } from './ui'

type DiscoverStatus = 'loading' | 'ready' | 'empty' | 'error'

interface DiscoveryPanelProps {
  gameId: string
  myCharacter: Character | null | 'loading'
  onMatch: () => void
  gamePlatforms?: string[]
}

export function DiscoveryPanel({ gameId, myCharacter, onMatch, gamePlatforms = [] }: DiscoveryPanelProps) {
  const [queue, setQueue] = useState<DiscoverCharacter[]>([])
  const [status, setStatus] = useState<DiscoverStatus>('loading')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [activePlatforms, setActivePlatforms] = useState<string[]>(gamePlatforms)
  const { data: fieldDefs } = useFieldDefinitions(gameId)

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => {
      const next = { ...prev }
      if (value === '') {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

  useEffect(() => {
    setStatus('loading')
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '')
    )
    discoverCharacters(
      gameId,
      activeFilters,
      activePlatforms.length > 0 ? activePlatforms : undefined
    )
      .then(chars => {
        setQueue(chars)
        setStatus(chars.length === 0 ? 'empty' : 'ready')
      })
      .catch(() => setStatus('error'))
  }, [gameId, filters, activePlatforms])

  async function handleInteract(type: 'Like' | 'Dislike') {
    const current = queue[0]
    if (!current || !myCharacter || myCharacter === 'loading') return
    try {
      const res = await interactWithCharacter(myCharacter.id, current.id, type)
      if (res.isMatch) onMatch()
    } catch { /* fail silently */ }
    setQueue(q => {
      const next = q.slice(1)
      if (next.length === 0) setStatus('empty')
      return next
    })
  }

  if (!myCharacter || myCharacter === 'loading') {
    return <EmptyState message="Create a character to start matching" />
  }

  const filterableFields = fieldDefs?.schemaStatus === 'Generated'
    ? fieldDefs.fields.filter(f => f.isFilterable && f.type === 'Select')
    : []

  const showFilters = filterableFields.length > 0 || gamePlatforms.length > 0

  return (
    <div className="flex flex-col gap-4">
      {showFilters && (
        <DiscoveryFilters
          fields={filterableFields}
          activeFilters={filters}
          onChange={handleFilterChange}
          gamePlatforms={gamePlatforms}
          activePlatforms={activePlatforms}
          onPlatformChange={setActivePlatforms}
        />
      )}

      {status === 'loading' && (
        <div className="flex justify-center py-10"><Spinner label="Scanning the realm..." /></div>
      )}

      {(status === 'empty' || status === 'error') && (
        <EmptyState
          message={status === 'empty' ? 'All caught up — check back later.' : 'Could not load players.'}
        />
      )}

      {status === 'ready' && (
        <div className="relative" style={{ height: '520px' }}>
          {queue.slice(0, 2).map((char, i) => (
            <SwipeCard
              key={char.id}
              character={char}
              onLike={() => handleInteract('Like')}
              onDislike={() => handleInteract('Dislike')}
              isTop={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Pass gamePlatforms from RealmPage to DiscoveryPanel**

In `apps/web/src/pages/RealmPage.tsx`, find the `<DiscoveryPanel>` usage and add the `gamePlatforms` prop:

```tsx
<DiscoveryPanel
  gameId={gameId!}
  myCharacter={myCharacter}
  gamePlatforms={userGame?.platforms ?? []}
  onMatch={() => {
    setMatchBanner(true)
    setTimeout(() => setMatchBanner(false), 2500)
  }}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: build succeeds with no type errors.

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
```

Navigate to a game realm. Verify:
- Platform filter appears above AI filters with the game's platforms pre-selected (highlighted)
- Toggling a platform off deselects it; the queue reloads
- `+ More platforms` expands the grouped list
- Clicking a platform in the expanded list adds it to active (shows as highlighted badge in primary row)
- Collapsing hides the extra group but keeps the selected override visible

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts \
        apps/web/src/components/DiscoveryFilters.tsx \
        apps/web/src/components/DiscoveryPanel.tsx \
        apps/web/src/pages/RealmPage.tsx
git commit -m "feat: platform multi-select filter in discovery panel"
```

---

## Task 4: Backend platform filtering (TDD)

**Files:**
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/DiscoverFilterTests.cs`
- Modify: `apps/api/Services/Interfaces/ICharacterService.cs`
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/api/Controllers/CharactersController.cs`

- [ ] **Step 1: Write the three failing tests**

Add the following three test methods to the `DiscoverFilterTests` class in `apps/tests/PartyUp.Api.Tests/Features/Characters/DiscoverFilterTests.cs`, inside the class body (before the closing `}`), above the `// ── helpers ──` comment:

```csharp
[Fact]
public async Task Discover_WithSinglePlatformFilter_ReturnsOnlyThatPlatform()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();
    var clientC = await CreateAuthenticatedClientAsync();

    var externalId = Interlocked.Increment(ref _externalIdCounter);
    var userGameA = await AddGameAsync(clientA, externalId);
    var userGameB = await AddGameAsync(clientB, externalId);
    var userGameC = await AddGameAsync(clientC, externalId);
    var gameId = userGameC.GameId;

    (await clientA.PostAsJsonAsync("/api/characters", new
    {
        name = "Xbox Player",
        platform = "Xbox One X",
        platformHandle = "PlayerA",
        userGameId = userGameA.Id
    })).EnsureSuccessStatusCode();

    (await clientB.PostAsJsonAsync("/api/characters", new
    {
        name = "PC Player",
        platform = "PC (Windows)",
        platformHandle = "PlayerB",
        userGameId = userGameB.Id
    })).EnsureSuccessStatusCode();

    (await clientC.PostAsJsonAsync("/api/characters", new
    {
        name = "My Character",
        platform = "Mac",
        platformHandle = "PlayerC",
        userGameId = userGameC.Id
    })).EnsureSuccessStatusCode();

    var response = await clientC.GetAsync(
        $"/api/characters/discover?gameId={gameId}&platform=Xbox One X");
    response.StatusCode.Should().Be(HttpStatusCode.OK);

    var discovered = await response.Content.ReadFromJsonAsync<List<DiscoveredCharacterDto>>();
    discovered!.Should().ContainSingle(c => c.Name == "Xbox Player");
    discovered.Should().NotContain(c => c.Name == "PC Player");
}

[Fact]
public async Task Discover_WithMultiplePlatformFilters_ReturnsAllMatchingPlatforms()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();
    var clientC = await CreateAuthenticatedClientAsync();
    var clientD = await CreateAuthenticatedClientAsync();

    var externalId = Interlocked.Increment(ref _externalIdCounter);
    var userGameA = await AddGameAsync(clientA, externalId);
    var userGameB = await AddGameAsync(clientB, externalId);
    var userGameC = await AddGameAsync(clientC, externalId);
    var userGameD = await AddGameAsync(clientD, externalId);
    var gameId = userGameD.GameId;

    (await clientA.PostAsJsonAsync("/api/characters", new
    {
        name = "Xbox Player",
        platform = "Xbox One X",
        platformHandle = "PlayerA",
        userGameId = userGameA.Id
    })).EnsureSuccessStatusCode();

    (await clientB.PostAsJsonAsync("/api/characters", new
    {
        name = "PC Player",
        platform = "PC (Windows)",
        platformHandle = "PlayerB",
        userGameId = userGameB.Id
    })).EnsureSuccessStatusCode();

    (await clientC.PostAsJsonAsync("/api/characters", new
    {
        name = "PS5 Player",
        platform = "PS5",
        platformHandle = "PlayerC",
        userGameId = userGameC.Id
    })).EnsureSuccessStatusCode();

    (await clientD.PostAsJsonAsync("/api/characters", new
    {
        name = "My Character",
        platform = "Mac",
        platformHandle = "PlayerD",
        userGameId = userGameD.Id
    })).EnsureSuccessStatusCode();

    var response = await clientD.GetAsync(
        $"/api/characters/discover?gameId={gameId}&platform=Xbox One X&platform=PC (Windows)");
    response.StatusCode.Should().Be(HttpStatusCode.OK);

    var discovered = await response.Content.ReadFromJsonAsync<List<DiscoveredCharacterDto>>();
    discovered!.Should().Contain(c => c.Name == "Xbox Player");
    discovered.Should().Contain(c => c.Name == "PC Player");
    discovered.Should().NotContain(c => c.Name == "PS5 Player");
}

[Fact]
public async Task Discover_WithNoPlatformFilter_ReturnsAllPlatforms()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();
    var clientC = await CreateAuthenticatedClientAsync();

    var externalId = Interlocked.Increment(ref _externalIdCounter);
    var userGameA = await AddGameAsync(clientA, externalId);
    var userGameB = await AddGameAsync(clientB, externalId);
    var userGameC = await AddGameAsync(clientC, externalId);
    var gameId = userGameC.GameId;

    (await clientA.PostAsJsonAsync("/api/characters", new
    {
        name = "Xbox Player",
        platform = "Xbox One X",
        platformHandle = "PlayerA",
        userGameId = userGameA.Id
    })).EnsureSuccessStatusCode();

    (await clientB.PostAsJsonAsync("/api/characters", new
    {
        name = "PC Player",
        platform = "PC (Windows)",
        platformHandle = "PlayerB",
        userGameId = userGameB.Id
    })).EnsureSuccessStatusCode();

    (await clientC.PostAsJsonAsync("/api/characters", new
    {
        name = "My Character",
        platform = "Mac",
        platformHandle = "PlayerC",
        userGameId = userGameC.Id
    })).EnsureSuccessStatusCode();

    // No platform param → returns all platforms
    var response = await clientC.GetAsync($"/api/characters/discover?gameId={gameId}");
    response.StatusCode.Should().Be(HttpStatusCode.OK);

    var discovered = await response.Content.ReadFromJsonAsync<List<DiscoveredCharacterDto>>();
    discovered!.Should().HaveCount(2);
}
```

- [ ] **Step 2: Run the new tests — verify they FAIL**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~Discover_WithSinglePlatformFilter OR FullyQualifiedName~Discover_WithMultiplePlatformFilters OR FullyQualifiedName~Discover_WithNoPlatformFilter" --no-build -v normal
```

Expected: all three FAIL (the platform param is currently ignored by the backend).

- [ ] **Step 3: Update ICharacterService interface**

Replace the `DiscoverCharactersAsync` signature in `apps/api/Services/Interfaces/ICharacterService.cs`:

```csharp
Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(
    Guid userId,
    Guid gameId,
    Dictionary<string, string>? filters = null,
    List<string>? platformFilters = null);
```

Full file after change:

```csharp
using PartyUp.Api.Models.DTOs.Character;

public interface ICharacterService
{
  Task<CharacterResponse?> CreateCharacterAsync(Guid userId, Guid userGameId, CreateCharacterRequest request);
  Task<List<CharacterResponse>> GetCharactersForUserGameAsync(Guid userId, Guid userGameId);
  Task<List<CharacterResponse>> GetAllCharactersForUserAsync(Guid userId);
  Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(
      Guid userId,
      Guid gameId,
      Dictionary<string, string>? filters = null,
      List<string>? platformFilters = null);
  Task<bool> UpdateCharacterAsync(Guid userId, Guid userGameId, Guid characterId, UpdateCharacterRequest request);
  Task<bool> DeleteCharacterAsync(Guid userId, Guid userGameId, Guid characterId);
}
```

- [ ] **Step 4: Add platform IN filter to CharacterService**

In `apps/api/Services/CharacterService.cs`, find the `DiscoverCharactersAsync` method signature and update it to:

```csharp
public async Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(
    Guid userId,
    Guid gameId,
    Dictionary<string, string>? filters = null,
    List<string>? platformFilters = null)
```

Then, inside that method, add the platform filter **immediately after** the line `!alreadySeenIds.Contains(c.Id));` and before the `if (filters != null && filters.Count > 0)` block:

```csharp
if (platformFilters != null && platformFilters.Count > 0)
    query = query.Where(c => platformFilters.Contains(c.Platform));
```

The relevant section of the method should look like this after the change:

```csharp
var query = _db.Characters
  .Include(c => c.UserGame)
    .ThenInclude(ug => ug.Game)
  .Where(c =>
    c.UserGame.GameId == gameId &&
    c.UserGame.UserId != userId &&
    !alreadySeenIds.Contains(c.Id));

if (platformFilters != null && platformFilters.Count > 0)
    query = query.Where(c => platformFilters.Contains(c.Platform));

if (filters != null && filters.Count > 0)
{
    // ... existing AI field filter logic unchanged ...
}
```

- [ ] **Step 5: Update CharactersController to extract platform params**

Replace the `Discover` action in `apps/api/Controllers/CharactersController.cs`:

```csharp
[HttpGet("discover")]
public async Task<IActionResult> Discover([FromQuery] Guid gameId)
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var platformFilters = Request.Query["platform"].ToList();
    var filters = Request.Query
        .Where(kv => kv.Key != "gameId" && kv.Key != "platform")
        .ToDictionary(kv => kv.Key, kv => kv.Value.ToString());
    var result = await _characterService.DiscoverCharactersAsync(userId, gameId, filters, platformFilters);
    return Ok(result);
}
```

- [ ] **Step 6: Run the new tests — verify they PASS**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~Discover_WithSinglePlatformFilter OR FullyQualifiedName~Discover_WithMultiplePlatformFilters OR FullyQualifiedName~Discover_WithNoPlatformFilter" -v normal
```

Expected: all three PASS.

- [ ] **Step 7: Run the full test suite to check for regressions**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/tests/PartyUp.Api.Tests/Features/Characters/DiscoverFilterTests.cs \
        apps/api/Services/Interfaces/ICharacterService.cs \
        apps/api/Services/CharacterService.cs \
        apps/api/Controllers/CharactersController.cs
git commit -m "feat: backend platform IN filter for discover endpoint"
```

---

## Done

At this point:
- Creating/editing a character lets users pick granular hardware (Xbox One X, PS5 Pro, Steam Deck, etc.) via the inline expand section, regardless of what RAWG knows about the game's release platforms.
- Discovery pre-filters to the game's RAWG platforms on load; users can toggle those off, expand to add any platform from the full list, and the queue reloads.
- The backend filters by an `IN` clause on `Character.Platform` when one or more `platform` query params are present; no platform param = no filter.
