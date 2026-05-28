# Open Questions — Omni-Odin

Tracking ambiguities surfaced during the substrate-aligned data model refactor.
Each entry includes context, the decision made (if any), and the follow-up needed.

> Convention: ❓ open · ⚠️ resolved-with-caveat · ✅ resolved

---

## 🔗 How to identify + connect a specific bot (bot_id → Odin projectId)

A bot's identifier "lifts" from the Botscrew admin URL:
```
https://bots.getskitickets.com/admin/bot/2/knowledge/instructions
                                        └──┘
                              bot_id = 2  (integer, sequential:
                              also seen 101 = Cranmore chat, 248 = Mtn Collective voice)
```

**Two different identifiers — don't conflate them:**

| ID | What it is | Who uses it | Where to get it |
|---|---|---|---|
| **Botscrew bot_id** (`2`) | Botscrew's wrapper identifier | Botscrew admin URL + their private `/api/private/...` | Visible in the admin URL |
| **Odin `projectId`** | The Odin project the bot maps to | **Odin's API** (the one omni-odin would call) | Inside Botscrew's `odinConfigs` for that bot — **Botscrew holds it** |

**The mapping chain:**
```
URL /bot/2/  →  Botscrew bot_id = 2  →  (Botscrew odinConfigs)  →  Odin projectId + agentId  →  Odin API
                └─ you can see this ─┘   └── Botscrew holds the mapping + the credentials ──┘
```
(Per `../reference/ODIN_SUBSTRATE.md` §3: a live bot's `odinConfigs` exposed
`projectId` + `recognitionProvider: OPEN_AI` + an `<odinId>` = the Odin agent id.)

**Consequence:** the bot_id tells you *which* bot (omni-odin's
`model.ts::Channel.botscrewBotId` already holds it). But connecting omni-odin to
live data/config requires that bot's **Odin projectId + scoped apiKey/apiSecret** —
which Botscrew holds. Concrete Tuesday ask:

> "Each bot has a bot_id in your admin URL (bot 2, 101, 248…), and each maps to an
> Odin projectId in its config. For our bots, can you provision the Odin projectId
> + scoped API credentials so omni reads/writes those projects directly?"

---

## ✅ Resolved by the Botscrew product documentation (May 2026)

We obtained Botscrew's official product help docs (66 pages, now in
`../reference/botscrew-docs/`). This replaced a lot of inference with documented
behavior. Findings:

### ✅ R1. Odin IS the orchestration brain (confirmed in writing)

`AI Actions.txt`: *"An AI Action is a specific function that can be triggered by
**ODIN** based on user input."* No longer inference — Botscrew's own docs name
Odin as the engine that interprets intent and triggers actions. Validates
`../reference/ODIN_SUBSTRATE.md`.

### ✅ R2. Two routing mechanisms (this is your "smart routing")

- **AI Actions** (`AI Actions.txt`) — AI/intent-based. Odin interprets the user's
  intent → triggers a named action → collects required parameters → fires the
  action's atom → stores outcome in `last_ai_action_result`.
- **Smart redirect** (`Smart redirect.txt`) — deterministic attribute branching
  (operators: is / is not / greater / less / contains / is default; conjunctions
  and/or; priority by list order; "Redirect to" vs "Default reply").

Department routing uses BOTH. The human-handover branch is a Smart redirect on
`current_request_status` + `is_in_working_hours`.

### ✅ R3. Resort feeds = "API call" atoms → validates `CustomToolRef`

`API call.txt`: the API-call atom defines an outbound HTTP request (GET/POST/PUT/
DELETE), can send user attributes in the body, and maps the response into
attributes or messages (incl. JSON-path response mapping). This is exactly how
`get_lift_status` / `get_snow_report` are wired — confirming `model.ts::CustomToolRef`
(endpoint / method / headers / body / response mapping) is substrate-accurate.

**Important caveat:** the API-call atom is **outbound** (Botscrew → external).
It is NOT an inbound API for omni to push config into Botscrew. See O2 below.

### ✅ R4. AI Action shape maps 1:1 to our model

| Botscrew AI Action | `model.ts` |
|---|---|
| AI action name | `CustomToolRef.name` |
| "Description for AI" (when to trigger) | `CustomToolRef.description` |
| Parameters (type / required / values) | `CustomToolRef.inputSchema` |
| Atom to trigger (API call) | `CustomToolRef.endpoint` |
| `last_ai_action_result` | the tool's output/result |

No model refactor needed.

### ✅ R5. Full support handoff state machine (`'Support' tab.txt`)

`current_request_status`:
- `open` — user enters support mode via "Online support (open request)" atom
  (Human handover flow). **Bot stops replying** to the user.
- `pending` — request made during non-working hours (`is_in_working_hours: false`).
  **Bot keeps replying** until an agent picks up.
- expired — no agent claimed within **20 min** → auto-transferred back to bot.
- exit — user types **"back to bot"** or clicks any flow option → back to bot.
- "request already exists" — new request while a prior one is unclosed → "already
  recorded" message.

Agent-side groupings (the triage rail): **Assigned to me** (green icon) ·
**New requests** (clock icon if out-of-hours) · **Assigned** (other agents, black
icon) · **Expired requests** · **Chatbot** (all bot convos) · **Solved requests**.

Assignment mechanics: "Assign to me" / "Assign to…" (another agent) / "Reassign
to me" / "Reassign to…". **Sending a message auto-assigns.** Close via "Close
request" (+ optional end-message atom from dropdown). Disconnect case: if the
user closes the widget, input disables ("User closed the chat…") and a **"Resolve
request"** button appears. System event messages in the transcript: "Agent
joined," "Agent left," "Conversation ended" (30 min inactive), "User ended the
conversation." Attachments: agent can send images + .gif.

→ This validates the agent-takeover demo (commit `ca1c9dc`) and gives the exact
behavior to refine it toward. See follow-up T1 below.

### ✅ R6. `SOLVED` vs `RESOLVED` — `SOLVED` is canonical for support groups

The Support doc consistently uses "Solved requests" (not "Resolved"). Matches the
observed export data in `BOTSCREW_DATA.md`. Treat `SOLVED` as canonical; the
dictionary's `RESOLVED` is doc drift. (Still worth a one-line confirm with Daria.)

---

## ⚠️ O1 + O2 — ANSWERED by the Odin API (the reframe)

**Update (2026-05-27): Found Odin's live API at `api.getodin.ai/openapi.json` —
850 endpoints, full platform management + read API.** See
`../reference/ODIN_API_SURFACE.md`. Both questions below are answered by an
EXISTING API; the only gate is credential access. This collapses two big "please
build us an API" asks into one small "please provision scoped Odin credentials"
ask.

### ⚠️ O1. Conversation + trace data — Odin HAS it (gated on credentials)

Odin exposes:
- `GET /project/{project_id}/chat/{chat_id}/all` — full transcript
- `GET /project/{project_id}/agent-interactions/{message_id}` — **per-message
  interaction detail** (the smart-routing trace the QA view needs — verify shape)
- `GET /actions/result/{project_id}/{flow_run_id}` + `/status/...` — action results
- `POST /analytics/chats/{project_id}/nlp_metrics_and_categories` — intent classes
- `/analytics/chats/...` — metrics, feedback, token usage

**Revised Daria ask:** *"Can we get scoped Odin API access to read our projects'
chat history + agent-interactions + analytics?"* (not "please build an export").

### ⚠️ O2. Inbound config management — Odin HAS it (gated on credentials)

Odin exposes full CRUD for agents (`/agents/new|edit|clone|delete`), personality
prompts (`/personality/*`), KB ingest (`/project/knowledge/add/*`, `/crawl-configs/*`,
`/knowledgebase-settings/*`), actions (`/actions/save|delete|export`), and
workflows (`/workflows/*`). omni-odin's Knowledge page maps directly onto these.

**Revised Daria ask:** *"Odin's API already supports reading/writing agent config,
KB, actions, and workflows. Can you provision GSB scoped Odin API credentials
(apiKey/apiSecret) for our projects so omni integrates directly?"*

### The caveats (carry into the meeting — see ODIN_API_SURFACE.md for detail)

1. Credentials are Botscrew's (bots live in their Odin project) — need them to provision scoped access.
2. On-prem vs cloud: Odin runs on-prem in Botscrew's VPC (`SYSTEM_ARCHITECTURE.md`); `api.getodin.ai` is public cloud. Confirm the on-prem instance exposes the same API + GSB can reach it.
3. Disintermediation tension: direct Odin access partially routes around Botscrew's wrapper. Frame collaboratively (omni = GSB admin over Odin; Botscrew keeps runtime/hosting/license/billing/telephony + doesn't have to build omni's features).
4. Odin docs say a custom frontend over Odin is an intended use case (`ODIN_SUBSTRATE.md` §11) — the API surface proves it.

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

## Follow-up build tasks surfaced

### T1. Refine the agent-takeover demo to match the real state machine

The takeover demo (commit `ca1c9dc`) has "Assign to me" + "Close request" +
agent message styling. R5 reveals the full behavior to align toward:
- **"Assign to…"** (assign to another agent) + **"Reassign to me / …"**
- **Sending a message auto-assigns** (no button needed)
- **Disconnect case** → input disables + **"Resolve request"** button
- **System event messages** in the transcript ("Agent joined," "Agent left,"
  "Conversation ended" after 30 min, "User ended the conversation")
- **Close with an end-message atom** picked from a dropdown
- **Out-of-hours / pending** state styling (bot still replying)

All UI-buildable now (demo/local). Real wiring needs O2 (inbound API) +
real-time delivery to the visitor's widget.

---

## Architectural questions to surface to BotScrew / Daria

The two headline asks are now **O1** and **O2** above (trace data in export;
inbound management API). Bundle those with the remaining items below into the
next Daria conversation:

- **O1 (headline)** — expose per-message flow/atom + AI-action name + parameters
  + `last_ai_action_result` (for the conversation-trace view).
- **O2 (headline)** — inbound API to read/write agent config, KB, prompts, flows.
- **§F.8 (`OMNI_ODIN_ALIGNMENT.md`)** — Custom Tool registration, per-channel
  toolkit selection, Workflow Manager wiring, per-tool auth, tool versioning.
  *(R3/R4 partially answer this: tools = API-call atoms + AI Actions. Remaining:
  per-channel toolkit selection + Workflow Manager equivalent.)*
- **`BOTSCREW_DATA.md` §8** — runtime lifecycle precedence (prompt vs KB vs flows
  vs actions), platform enum extensibility for `EMAIL`, one-bot-multi-channel
  feasibility. *(`SOLVED` vs `RESOLVED` now resolved — see R6.)*
- **`ODIN_SUBSTRATE.md` §1** — Are a resort's existing chat + voice bots
  *agents in one Odin project* (already sharing a KB) or *separate Odin
  projects* (duplicated KB)? Determines unification effort per resort.
