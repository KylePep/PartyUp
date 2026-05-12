# Create Character Form Update — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `CreateCharacterPage.tsx` to include all fields from the updated `Character` model, organized into five labeled sections.

**Architecture:** Two files change — `characters.ts` gets updated TypeScript types, and `CreateCharacterPage.tsx` gets new state variables, constants, a sectioned form layout, and an expanded submit handler. No new files or hooks needed.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS (brand tokens), React Router

---

### Task 1: Update API types in `characters.ts`

**Files:**
- Modify: `apps/web/src/api/endpoints/characters.ts`

- [ ] **Step 1: Replace `Character` and `CharacterCreate` types**

Replace the existing `Character` and `CharacterCreate` type definitions. Leave `DiscoverCharacter`, `MatchResponse`, `InteractionType`, and all functions untouched.

```typescript
export type Character = {
  id: string;
  userGameId?: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  mainRole?: string;
  secondaryRole?: string;
  preferredModes: string[];
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  playstyle?: string;
  rank?: string;
  region?: string;
};

export type CharacterCreate = {
  userGameId: string;
  platform: string;
  platformHandle: string;
  name: string;
  imageUrl?: string;
  bio?: string;
  mainRole?: string;
  secondaryRole?: string;
  preferredModes: string[];
  timeZone?: string;
  activeTimes?: string[];
  usesVoiceChat?: boolean;
  languages?: string[];
  playstyle?: string;
  rank?: string;
  region?: string;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds (or only pre-existing errors unrelated to `characters.ts`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/endpoints/characters.ts
git commit -m "feat: update Character and CharacterCreate types for new model"
```

---

### Task 2: Update state, constants, and submit handler in `CreateCharacterPage.tsx`

**Files:**
- Modify: `apps/web/src/pages/CreateCharacterPage.tsx`

This task touches everything except the JSX — constants at the top, state variables, and `handleSubmit`. The JSX is replaced wholesale in Task 3.

- [ ] **Step 1: Replace the constants block at the top of the file**

Replace the existing three constant declarations (`PLAYSTYLES`, `REGIONS`, `RANKS`) with the full set:

```typescript
const PLATFORMS = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"];
const ROLES = ["Tank", "DPS", "Support", "Healer", "Assassin", "Marksman", "Flex"];
const PREFERRED_MODES = ["Ranked", "Casual", "Co-op", "Story", "PvP", "PvE", "Battle Royale"];
const PLAYSTYLES = ["Casual", "Competitive", "Hybrid", "Hardcore", "Story-focused"];
const RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Legend", "Mythic"];
const REGIONS = ["NA East", "NA West", "EU", "Asia", "OCE", "SA", "Global"];
const ACTIVE_TIMES = ["Morning", "Afternoon", "Evening", "Late Night"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Japanese", "Korean", "Chinese", "Arabic", "Russian"];
```

- [ ] **Step 2: Replace the state declarations**

Replace the existing state block (`name`, `bio`, `playstyle`, `rank`, `region`, `status`, `errorMsg`) with the full set:

```typescript
const [platform, setPlatform] = useState("");
const [platformHandle, setPlatformHandle] = useState("");
const [name, setName] = useState("");
const [imageUrl, setImageUrl] = useState("");
const [bio, setBio] = useState("");
const [mainRole, setMainRole] = useState("");
const [secondaryRole, setSecondaryRole] = useState("");
const [preferredModes, setPreferredModes] = useState<string[]>([]);
const [playstyle, setPlaystyle] = useState("");
const [rank, setRank] = useState("");
const [region, setRegion] = useState("");
const [timeZone, setTimeZone] = useState("");
const [activeTimes, setActiveTimes] = useState<string[]>([]);
const [usesVoiceChat, setUsesVoiceChat] = useState<boolean | undefined>(undefined);
const [languages, setLanguages] = useState<string[]>([]);
const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
const [errorMsg, setErrorMsg] = useState("");
```

- [ ] **Step 3: Replace `handleSubmit`**

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!name.trim() || !platform || !platformHandle.trim()) return;
  if (!userGame) { setErrorMsg("Realm not found."); setStatus("error"); return; }
  setStatus("loading");
  setErrorMsg("");
  try {
    await createCharacter({
      userGameId: userGame.id,
      platform,
      platformHandle: platformHandle.trim(),
      name: name.trim(),
      imageUrl: imageUrl.trim() || undefined,
      bio: bio.trim() || undefined,
      mainRole: mainRole || undefined,
      secondaryRole: secondaryRole || undefined,
      preferredModes,
      playstyle: playstyle || undefined,
      rank: rank || undefined,
      region: region || undefined,
      timeZone: timeZone.trim() || undefined,
      activeTimes: activeTimes.length > 0 ? activeTimes : undefined,
      usesVoiceChat,
      languages: languages.length > 0 ? languages : undefined,
    });
    navigate(`/realm/${gameId}`);
  } catch {
    setErrorMsg("Failed to create character. Please try again.");
    setStatus("error");
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/CreateCharacterPage.tsx
git commit -m "feat: add state and submit handler for new character fields"
```

---

### Task 3: Replace form JSX with five-section layout

**Files:**
- Modify: `apps/web/src/pages/CreateCharacterPage.tsx`

Replace the entire `<form>` block (from `<form onSubmit={handleSubmit}` to the closing `</form>`) with the full sectioned layout below.

- [ ] **Step 1: Replace the `<form>` block**

```tsx
<form onSubmit={handleSubmit} className="space-y-8">

  {/* // IDENTITY */}
  <div>
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-brand-border" />
      <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-brand-muted">// Identity</span>
      <div className="h-px flex-1 bg-brand-border" />
    </div>
    <div className="space-y-6">

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">
          Platform *
        </label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(platform === p ? "" : p)}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
              style={{
                background: platform === p ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
                border: platform === p ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
                color: platform === p ? "#00e5ff" : "#6e6e99",
              }}
            >{p}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-2">
          Platform Handle *
        </label>
        <input
          type="text"
          value={platformHandle}
          onChange={(e) => setPlatformHandle(e.target.value)}
          placeholder="e.g. KylePep#1234, PSN_Username..."
          maxLength={100}
          required
          className="w-full px-4 py-3 font-display text-brand-text placeholder:text-brand-muted/50 outline-none transition-all duration-200"
          style={{ background: "rgba(13,13,30,0.8)", border: "1px solid rgba(28,28,56,1)" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(28,28,56,1)")}
        />
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-2">
          Character Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. NightShade, IronFang..."
          maxLength={50}
          required
          className="w-full px-4 py-3 font-display text-brand-text placeholder:text-brand-muted/50 outline-none transition-all duration-200"
          style={{ background: "rgba(13,13,30,0.8)", border: "1px solid rgba(28,28,56,1)" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(28,28,56,1)")}
        />
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-2">
          Image URL
        </label>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          maxLength={500}
          className="w-full px-4 py-3 font-display text-brand-text placeholder:text-brand-muted/50 outline-none transition-all duration-200"
          style={{ background: "rgba(13,13,30,0.8)", border: "1px solid rgba(28,28,56,1)" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(28,28,56,1)")}
        />
      </div>
    </div>
  </div>

  {/* // ABOUT */}
  <div>
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-brand-border" />
      <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-brand-muted">// About</span>
      <div className="h-px flex-1 bg-brand-border" />
    </div>
    <div>
      <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-2">
        Bio
      </label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="What kind of player are you? What are you looking for in a teammate?"
        maxLength={1000}
        rows={4}
        className="w-full px-4 py-3 font-body text-sm text-brand-text placeholder:text-brand-muted/50 outline-none resize-none transition-all duration-200"
        style={{ background: "rgba(13,13,30,0.8)", border: "1px solid rgba(28,28,56,1)" }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.5)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(28,28,56,1)")}
      />
      <div className="font-mono text-[10px] text-brand-muted/50 text-right mt-1">{bio.length}/1000</div>
    </div>
  </div>

  {/* // GAMEPLAY */}
  <div>
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-brand-border" />
      <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-brand-muted">// Gameplay</span>
      <div className="h-px flex-1 bg-brand-border" />
    </div>
    <div className="space-y-6">

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Main Role</label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setMainRole(mainRole === r ? "" : r)}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
              style={{
                background: mainRole === r ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
                border: mainRole === r ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
                color: mainRole === r ? "#00e5ff" : "#6e6e99",
              }}
            >{r}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Secondary Role</label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSecondaryRole(secondaryRole === r ? "" : r)}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
              style={{
                background: secondaryRole === r ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
                border: secondaryRole === r ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
                color: secondaryRole === r ? "#00e5ff" : "#6e6e99",
              }}
            >{r}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Preferred Modes</label>
        <div className="flex flex-wrap gap-2">
          {PREFERRED_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPreferredModes((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
              style={{
                background: preferredModes.includes(m) ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
                border: preferredModes.includes(m) ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
                color: preferredModes.includes(m) ? "#00e5ff" : "#6e6e99",
              }}
            >{m}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Playstyle</label>
        <div className="flex flex-wrap gap-2">
          {PLAYSTYLES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlaystyle(playstyle === p ? "" : p)}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
              style={{
                background: playstyle === p ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
                border: playstyle === p ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
                color: playstyle === p ? "#00e5ff" : "#6e6e99",
              }}
            >{p}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Rank</label>
        <div className="flex flex-wrap gap-2">
          {RANKS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRank(rank === r ? "" : r)}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
              style={{
                background: rank === r ? "rgba(255,215,0,0.12)" : "rgba(13,13,30,0.6)",
                border: rank === r ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(28,28,56,1)",
                color: rank === r ? "#ffd700" : "#6e6e99",
              }}
            >{r}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Region</label>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(region === r ? "" : r)}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
              style={{
                background: region === r ? "rgba(124,58,237,0.15)" : "rgba(13,13,30,0.6)",
                border: region === r ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(28,28,56,1)",
                color: region === r ? "#a78bfa" : "#6e6e99",
              }}
            >{r}</button>
          ))}
        </div>
      </div>
    </div>
  </div>

  {/* // AVAILABILITY */}
  <div>
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-brand-border" />
      <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-brand-muted">// Availability</span>
      <div className="h-px flex-1 bg-brand-border" />
    </div>
    <div className="space-y-6">

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-2">
          Time Zone
        </label>
        <input
          type="text"
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          placeholder="e.g. EST, UTC+9, PST..."
          className="w-full px-4 py-3 font-display text-brand-text placeholder:text-brand-muted/50 outline-none transition-all duration-200"
          style={{ background: "rgba(13,13,30,0.8)", border: "1px solid rgba(28,28,56,1)" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(28,28,56,1)")}
        />
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Active Times</label>
        <div className="flex flex-wrap gap-2">
          {ACTIVE_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTimes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
              className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
              style={{
                background: activeTimes.includes(t) ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
                border: activeTimes.includes(t) ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
                color: activeTimes.includes(t) ? "#00e5ff" : "#6e6e99",
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">Voice Chat</label>
        <div className="flex gap-2">
          {[true, false].map((val) => {
            const label = val ? "Yes" : "No";
            const isSelected = usesVoiceChat === val;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setUsesVoiceChat(isSelected ? undefined : val)}
                className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
                style={{
                  background: isSelected ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
                  border: isSelected ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
                  color: isSelected ? "#00e5ff" : "#6e6e99",
                }}
              >{label}</button>
            );
          })}
        </div>
      </div>
    </div>
  </div>

  {/* // LANGUAGES */}
  <div>
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-brand-border" />
      <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-brand-muted">// Languages</span>
      <div className="h-px flex-1 bg-brand-border" />
    </div>
    <div className="flex flex-wrap gap-2">
      {LANGUAGES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLanguages((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l])}
          className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
          style={{
            background: languages.includes(l) ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
            border: languages.includes(l) ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
            color: languages.includes(l) ? "#00e5ff" : "#6e6e99",
          }}
        >{l}</button>
      ))}
    </div>
  </div>

  {errorMsg && (
    <p className="font-mono text-brand-crimson text-xs border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3 tracking-wide">
      {errorMsg}
    </p>
  )}

  <button
    type="submit"
    disabled={!name.trim() || !platform || !platformHandle.trim() || status === "loading"}
    className="w-full py-4 font-display font-black text-sm tracking-widest uppercase text-brand-bg transition-all duration-200 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
    style={{
      background: "linear-gradient(135deg, #00e5ff, #0088ff)",
      boxShadow: name.trim() && platform && platformHandle.trim() ? "0 0 30px rgba(0,229,255,0.3)" : "none",
    }}
  >
    {status === "loading" ? "Creating..." : "Create Character →"}
  </button>
</form>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no new errors.

- [ ] **Step 3: Verify in browser**

Start the dev server:

```bash
npm run dev --prefix apps/web
```

Navigate to a game realm and click "Create Character". Verify:
- Five labeled section dividers appear (`// Identity`, `// About`, `// Gameplay`, `// Availability`, `// Languages`)
- Platform pills select/deselect correctly (only one active at a time)
- PreferredModes, ActiveTimes, and Languages pills toggle independently (multiple can be active)
- Voice Chat Yes/No deselects when clicked again (returns to unset)
- Submit button is disabled until Platform, PlatformHandle, and Name are all filled
- Submitting a valid character navigates back to the realm page

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/CreateCharacterPage.tsx
git commit -m "feat: update CreateCharacterPage with five-section layout for new character model"
```
