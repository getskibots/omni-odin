# Open Questions — Omni-Odin

Tracking ambiguities surfaced during the substrate-aligned data model refactor.
Each entry includes context, the decision made (if any), and the follow-up needed.

> Convention: ❓ open · ⚠️ resolved-with-caveat · ✅ resolved

---

## Data model refactor (first task)

### ❓ 1. Folder name remains `omni + odin` with spaces and `+`

**Context:** The brief expected `omni-odin` to be the folder name (matching the
GitHub repo). I tried to rename `omni + odin` → `omni-odin` via `mv` and hit:

```
mv: cannot move … 'Device or resource busy'
```

Likely cause: an editor, OneDrive sync, or `node_modules` watcher holding file
handles in the folder.

**Impact:** Cosmetic only. Git remote, npm package name, Vercel link all work
with either folder name. CLI ergonomics suffer a bit (have to quote the path).

**Follow-up:** Brandon can rename the folder later when nothing's using it:

```bash
mv "omni + odin" "omni-odin"
```

Then `cd` into the renamed folder. No git or remote changes needed.

---

### ⚠️ 2. Legacy `parent.ts` kept in place; only partial page migration

**Context:** The brief said "update [the four real pages] to read from the new
model" but also "Do not redesign the pages in this pass." The Knowledge page +
TemplateForm component are tightly built around the OLD UI types
(`BehaviorSection`, `KnowledgeGroup`, `KnowledgeNote`, `RealtimeFlow`,
`ResortTemplate`, etc.) — these aren't substrate concepts, they're UI helpers
that organize the omni Preset form.

**Decision made:**
- `src/data/parent.ts` kept in place as the **legacy data layer** (header
  comment marks it as such).
- `DEFAULT_ELEVENLABS_AGENT_ID` re-exports from `seed.ts` so there's a single
  source of truth.
- **Migrated to the new model:**
  - `src/pages/SettingsChannels.tsx` (full migration — reads `mountainCollective`)
  - `src/pages/Widget.tsx` (reads `chatChannel.botscrewBotId`)
  - `src/components/TopBar.tsx` (reads `mountainCollective.displayName`)
- **Deferred to a follow-up task (Knowledge page redesign per the brief):**
  - `src/pages/Knowledge.tsx`
  - `src/components/TemplateForm.tsx`
  - `src/components/AssembledPreviewModal.tsx`
  - `src/components/TestVoiceModal.tsx`

The two model worlds coexist: `parent.ts` (legacy) and `model.ts` + `seed.ts`
(new). Build passes cleanly with both.

**Follow-up:** The Knowledge page redesign (next task per the brief) should
migrate TemplateForm to the new model and either delete `parent.ts` or shrink
it to a minimal compatibility shim.

---

### ❓ 3. The 17 JH knowledge groups didn't carry over to Mountain Collective

**Context:** The brief said:

> Don't remove or rewrite the existing 17 knowledge groups in the current model
> without preserving their content — they're seeded resort knowledge. Map them
> into the new `KnowledgeBase.sources` and `KnowledgeBase.templates` where
> appropriate.

I interpreted this as "preserve their content" + "where appropriate." The
groups are all Jackson Hole specific (lift tickets URL, season pass URL with
JH-specific dates, JH refund policies, etc.). Wholesale-mapping them into the
Mountain Collective seed would have been misleading data.

**Decision made:** Mountain Collective seed has 3 sample `KnowledgeSource`
entries (WEB_CRAWL of mountaincollective.com, in-KB DOCUMENT, FILE placeholder)
and 3 sample `KnowledgeTemplate` entries (FAQ/RESPONSE/FAQ about blackouts,
pickup, add-days) — these demonstrate the new shape with realistic MC content.
The JH content remains in `src/data/parent.ts::jacksonHole.template.knowledgeGroups`
(unchanged, still feeds the Knowledge page via TemplateForm).

**Follow-up:**
- If Jackson Hole should remain a *parallel seed alongside Mountain Collective*
  (so users can switch between resorts in the dashboard), build a second
  `Resort` for JH in `seed.ts` and add a resort-picker.
- If JH content should be archived because MC is now canonical, move the
  legacy `parent.ts` content into `docs/legacy/jackson-hole-knowledge.md` and
  drop it from source.

---

### ❓ 4. `CLAUDE_CODE_INSTRUCTIONS.md` referenced in brief but doesn't exist

The brief lists 5 reference docs. Only 4 exist in `docs/reference/`. The 5th
(`CLAUDE_CODE_INSTRUCTIONS.md`) was referenced as "older Claude Code guidance,
useful for general repo conventions" but isn't in the folder.

**Impact:** Minor — proceeded without it. Repo conventions inferred from the
omni codebase.

**Follow-up:** If there's older guidance somewhere (in omni or in another
project) that should travel with omni-odin, copy it in.

---

### ❓ 5. `src/data/conversations.ts` has a competing `Conversation`/`Message` type

**Context:** The Support page (`src/pages/Support.tsx`) reads from
`src/data/conversations.ts`, which defines its own `Conversation` and `Message`
types. The new `model.ts` also defines `Conversation` and `Message` (mirroring
the BotScrew export schema).

The two are NOT structurally identical:
- `conversations.ts::Conversation` is mock-data shape (compact, omni-friendly)
- `model.ts::Conversation` matches BotScrew's egress schema (Platform-based,
  with all the sparse identity/behavioral fields)

**Decision made:** Left `conversations.ts` untouched. Support page still works
with the mock-shaped data.

**Follow-up:** When the Support page is rebuilt against the new model (per the
"first three pages to align" priority in `OMNI_ODIN_ALIGNMENT.md` §7), pick
one of:
- Adapt the mock data in `conversations.ts` to match `model.ts::Conversation`.
- Delete `conversations.ts` and replace with a small seed in `seed.ts`.

---

### ❓ 6. `botscrewBotId` is a number in the new model but a string in the old

**Context:** Old shape: `botscrewBotId: 'bs_8721'` (string, prefixed).
New shape: `botscrewBotId: 101` (integer, matching BotScrew's actual integer
ids per `BOTSCREW_DATA.md`).

`SettingsChannels.tsx` now formats the integer for display as `'bs_${id}'` to
match the old visual convention. If BotScrew formally uses an integer (101,
248) and the `bs_xxxx` prefix was an omni invention, this display logic may be
wrong.

**Follow-up:** Confirm with Daria/BotScrew the canonical display format of bot
IDs. If `bs_NNNN` is purely an omni invention, drop the prefix from display
too (just show the integer).

---

### ❓ 7. Voice channel's `voiceAgentId` overlaps `DEFAULT_ELEVENLABS_AGENT_ID`

**Context:** The new `VoiceChannelConfig` has a `voiceAgentId` field. The seed
sets it to `'agent_4801ks9kyskcfgetyq0krbqj10cm'` (the Jackson Hole agent —
because that's the agent we have access to in ElevenLabs right now).

`DEFAULT_ELEVENLABS_AGENT_ID` (re-exported from `parent.ts`) is consumed by
`lib/elevenLabsVoice.ts::getElevenLabsAgentId()` as the fallback when
localStorage is empty. The brief said don't touch voice integration.

**Decision made:** `seed.ts` exports a `DEFAULT_ELEVENLABS_AGENT_ID` constant
derived from `voiceChannel.voice.voiceAgentId`. `parent.ts` now re-exports
from `seed.ts`. `lib/elevenLabsVoice.ts` unchanged.

**Follow-up:**
- Get a real Mountain Collective agent_id in ElevenLabs and update
  `voiceChannel.voice.voiceAgentId` in `seed.ts`. The whole chain updates
  automatically.
- Long-term: this lookup belongs on a resort registry, not a single constant.
  When omni-odin gets a real backend, replace the `DEFAULT_*` constant with
  `resortRegistry.get(resortId).channels.find(c => c.family==='voice').voice.voiceAgentId`.

---

### ❓ 8. `OMNI_BUILD_SUMMARY.md` is uncommitted in this repo

**Context:** The build summary I generated for the original omni prototype is
sitting at the repo root as an untracked file (carried over when this folder
was copied from omni).

**Decision made:** Left untracked. The brief didn't mention it, and it
describes the omni prototype state pre-substrate-refactor — not directly useful
for omni-odin going forward.

**Follow-up:** Either delete it, move into `docs/legacy/`, or commit if it's
worth keeping as a reference snapshot.

---

### ❓ 9. Static vs. dynamic data not yet separated in Knowledge content

The alignment doc (`OMNI_ODIN_ALIGNMENT.md` §B) is explicit about a critical
distinction:

> The Knowledge Base handles **static reference content**. Live operational
> data — lift status, today's snow report, current parking — does NOT belong
> in the KB. Those belong in the **Actions / Tool calling layer**.

The old omni model jammed live-ish content into the prompt and into knowledge
group URLs. The new seed splits them:
- KB sources/templates = static content (pass terms, FAQs, etc.)
- `actionLibrary.customTools` = live data (snow report, lift status, etc.)

But the existing JH content in `parent.ts` (still feeding the Knowledge page UI)
mixes both. The TemplateForm UI doesn't have a Tools/Actions layer yet —
that's the fifth layer the brief says to add in the next task (per
`OMNI_ODIN_ALIGNMENT.md` §F.7).

**Follow-up:** Knowledge page redesign should add the fifth layer + visually
distinguish static (KB) from live (Tools).

---

### ⚠️ 10. Mountain Collective seed channel statuses all set to `DRAFT`

**Context:** Per the brief, MC is the seed. None of MC's channels are actually
wired to live BotScrew bots in this prototype.

**Decision made:** All three channels (chat/voice/email) have `status: 'DRAFT'`
and `botscrewBotId: null`. The voice channel has a placeholder `voiceAgentId`
pointing at the JH agent (so the existing voice testing flow still works for
demos).

**Follow-up:** When real Mountain Collective bot IDs exist (or a different
seed resort is preferred for active demos), flip the status fields to `'ACTIVE'`
and populate `botscrewBotId`.

---

## Architectural questions to surface to BotScrew / Daria

These come from the alignment doc and the data model design. Worth bundling
into a future Botscrew conversation:

- **§F.8 Open questions for BotScrew** — Custom Tool registration, per-channel
  toolkit selection, Workflow Manager wiring, per-tool auth, tool versioning,
  whether existing GSB feeds are real Odin Custom Tools or prompt-stuffed text.
- **`BOTSCREW_DATA.md` Open Questions §8** — runtime lifecycle, configuration
  surface, API access, platform enum extensibility, `SOLVED` vs. `RESOLVED`
  canonical, one-bot-multi-channel feasibility.
- **`ODIN_SUBSTRATE.md` §1** — Are a resort's existing chat + voice bots
  *agents in one Odin project* (already sharing a KB) or *separate Odin
  projects* (duplicated KB)? This determines unification effort per resort.
