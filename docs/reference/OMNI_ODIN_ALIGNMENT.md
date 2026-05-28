# Omni ↔ Odin Alignment Structure

The reference architecture for aligning every Omni feature against the Odin substrate.
This doc tells you (and Claude Code, and any future you) how Omni's design decisions
map back to what Odin actually supports — so specs are grounded, not aspirational.

**Use this when:** building any new Omni page, writing a spec for BotScrew, or
evaluating whether a feature idea is substrate-supported or net-new GSB IP.

**Built on:** `ODIN_SUBSTRATE.md` (the engine model), `OMNI_DATA_MODEL.md` (types),
`BOTSCREW_DATA.md` (egress shapes), and the live Odin docs at `learn.getodin.ai`.

---

## Part 1: Folder structure (operational)

How to organize the Omni project so substrate alignment is built into the file tree.

```
Omni/
├── README.md
├── docs/
│   ├── reference/                  ← read-only substrate references
│   │   ├── ODIN_SUBSTRATE.md       ← engine model (Project/KB/Agents)
│   │   ├── BOTSCREW_DATA.md        ← conversation egress shapes
│   │   ├── OMNI_DATA_MODEL.md      ← Omni's TypeScript model
│   │   └── odin-md/                ← raw Odin .md files (snapshots)
│   │       ├── kb-overview.md
│   │       ├── agents.md
│   │       ├── sdk-overview.md
│   │       ├── toolkits-overview.md
│   │       ├── public-chatbot-configuration.md
│   │       ├── gmail.md
│   │       ├── microsoft-365.md
│   │       └── llms.txt
│   │
│   ├── alignment/                  ← THE substrate map (this doc + per-page)
│   │   ├── ALIGNMENT_INDEX.md      ← master map (Part 2 of this doc)
│   │   ├── knowledge-page.md       ← Knowledge page alignment
│   │   ├── appearance-tab.md       ← Appearance Dashboard alignment
│   │   ├── channels-page.md        ← multi-channel config alignment
│   │   ├── analytics-page.md       ← analytics alignment
│   │   └── email-channel.md        ← email toolkit alignment
│   │
│   └── handoff/                    ← packages ready for BotScrew
│       ├── README.md               ← how the handoff format works
│       ├── _template/              ← starter for each new page handoff
│       │   ├── README.md
│       │   ├── 01-design-intent.md
│       │   ├── 02-data-model.md
│       │   ├── 03-behaviors.md
│       │   └── 04-questions.md
│       └── knowledge-page/         ← first real handoff package
│           ├── README.md
│           ├── prototype-url.txt
│           ├── 01-design-intent.md
│           ├── 02-data-model.md
│           ├── 03-behaviors.md
│           ├── 04-questions.md
│           └── reference/
│               ├── current-screenshot.png
│               └── proposed-screenshot.png
│
└── src/                            ← Omni prototype code (React + Vite)
    ├── data/
    │   └── model.ts                ← types from OMNI_DATA_MODEL.md
    └── pages/
        ├── Knowledge.tsx
        ├── Channels.tsx
        └── ...
```

**The discipline:** every Omni page in `src/pages/` has a parallel alignment file
in `docs/alignment/` that maps it to Odin. When the page changes, update the
alignment file. When a handoff is built, it draws from both.

---

## Part 2: Master alignment map (the substance)

The audit table. Every major Omni concept, what it maps to in Odin, and the
implication for design.

### Legend
- **Native** — Odin has this exact capability, documented, working.
- **Adjacent** — Odin has something related but the shape/scope differs.
- **Extends** — GSB layer on top of an Odin capability (Odin enables it, we customize).
- **Custom** — no Odin equivalent; pure GSB IP, lives outside the substrate.
- **BotScrew** — handled by BotScrew's wrapper, not Odin.

| Confidence: ✅ confirmed from docs · ⚠️ inferred, worth verifying · ❓ open question |

---

### A. Core model

| Omni concept | Odin mapping | Type | Confidence | Notes |
|---|---|---|---|---|
| Resort (parent) | Project | Native | ✅ | One Odin Project = one resort. Container for KB + agents. |
| Shared knowledge | Project Knowledge Base | Native | ✅ | One KB per project; all agents in the project share it. |
| Channel (chat/voice/email) | Agent | Native | ✅ | Each channel = one Odin Agent with its own prompt + model + toolkits. |
| Channel overlay | Agent personality prompt + model + toolkits | Native | ✅ | The "overlay" is the agent config, not concatenated text. |
| Multi-channel unification | One Project → many Agents sharing one KB | Native | ✅ | Edit KB once → all channels see it. Native, not invented. |

**Odin source:** `kb-overview.md`, `agents.md`

---

### B. Knowledge base (Omni Knowledge page)

| Omni concept | Odin mapping | Type | Confidence | Notes |
|---|---|---|---|---|
| Website / web crawl source | Web Crawler (KB ingestion) | Native | ✅ | Native KB feature. |
| File uploads | KB File Upload | Native | ✅ | Native KB feature. |
| Text Edits (in-KB text) | KB Documents | Native | ✅ | Native KB feature. |
| FAQ / Q&A patterns | KB Templates (Q&A + Response) | Native | ✅ | Native KB feature, often skipped by builders. |
| Smart Tables (structured data) | Smart Tables | Native | ✅ | Lift status, pricing tables, etc. |
| Chunking config (size, overlap) | KB Chunking Strategy | Native | ✅ | Sentence vs. semantic, 64-512 tokens. |
| Connectors (Drive, SharePoint) | KB Connectors | Native | ✅ | Available, not yet surfaced in Omni. |
| Per-channel knowledge difference | NONE | Custom / N/A | ✅ | Knowledge is project-level. If channels need different knowledge, that's the agent's prompt filtering, not the KB. |

**Odin source:** `kb-overview.md`

**Static vs. live — a critical distinction for Omni design:**

The Knowledge Base (this section) handles **static reference content** — facts that
change rarely: resort policies, FAQ patterns, terrain descriptions, brand voice.
Updated through ingestion (crawl, file upload, document edit), embedded once, retrieved
by RAG. Best for things that are true for hours, days, or seasons.

**Live operational data** — lift status, today's snow report, current parking,
right-now wait times, real-time bookings — does NOT belong in the KB. Those belong
in the **Actions / Tool calling layer (Section I)**, fetched at the moment of the
question via Custom Tools.

A common antipattern (visible in some current bot prompts): cramming live-ish data
into the personality prompt as static text. This goes stale, bloats the prompt, and
forces re-saves on every change. The Omni redesign should explicitly move that data
out of prompts and into tool calls. See Section I.

---

### C. Agent / Instructions (per-channel config)

| Omni concept | Odin mapping | Type | Confidence | Notes |
|---|---|---|---|---|
| Agent name + icon | Agent Name + icon | Native | ✅ | |
| Personality prompt | Agent Personality Prompt | Native | ✅ | Authored by GSB; substrate just stores it. |
| Model selection | Agent Model | Native | ✅ | gpt-5.2, Claude, Gemini, etc. Runs on GSB OpenAI keys. |
| Response format (text/JSON) | Agent Response Format | Native | ✅ | JSON schema supported. |
| Toolkit selection per channel | Agent Toolkits | Native | ✅ | KB, Web Search, Workflow Manager, etc. |
| Custom resort API tools | Custom Tools / Workflow Manager | Native | ✅ | Lift status feeds, snow report API, etc. |
| Agent memory (per-user) | Agent Memory | Native | ✅ | Approval-gated, optional. |
| Prompt library | Prompt Library | Native | ✅ | Saved templates. |
| Version history / rollback | Version History | Native | ✅ | Audit trail, native to Odin. |

**Odin source:** `agents.md`

**Big finding:** the entire Instructions page in BotScrew's dashboard is a thin
surface over Odin agent config. Adding multi-agent support (per channel) is asking
BotScrew to expose what Odin already supports — multiple agents per project — not
inventing new capability.

---

### D. Appearance / Public Chatbot

| Omni concept | Odin mapping | Type | Confidence | Notes |
|---|---|---|---|---|
| Widget name | Chatbot Name | Native | ✅ | Exact match. |
| Welcome message | Welcome Message | Native | ✅ | Exact match. |
| Input placeholder | Input Placeholder Text | Native | ✅ | Exact match. |
| Brand / bubble color | Message Bubble/Header Color | Native | ✅ | Hex input. |
| Logo / header image | Widget Header Image | Native | ✅ | Exact match. |
| Custom launcher icon | Toggle Button Image | Native | ✅ | Exact match. |
| Suggested chips | Suggestions | Native | ✅ | One per line, native. |
| Default channel agent | Default Agent | Native | ✅ | Dropdown to pick which agent handles the conversation. |
| Display sources toggle | Display Sources | Native | ✅ | Free, not yet surfaced in Omni. |
| Enable multiple chats | Enable Multiple Chats | Native | ✅ | Free, not yet surfaced. |
| Pre-chat attention image + behavior | Pre-Chat Attention Image + behavior enum | Native | ✅ | Free; behavior enum (always/never/24h) is reusable. |
| Welcome-message delay | Welcome Display Delay | Native | ✅ | -1 disables; native. |
| Chat header background (separate from bubble) | partial — combined in Odin | Adjacent | ⚠️ | Odin treats bubble+header as one color. Splitting is a GSB extension. |
| Font size scaling | Font Size (px) | Adjacent | ⚠️ | Odin: absolute px. GSB: proportional scale. |
| Font family pickers | NONE | Custom | ✅ | No Odin equivalent. |
| Corner radius (master token) | NONE | Custom | ✅ | No Odin equivalent. |
| Depth effects (shadow/glow/radiate) | NONE | Custom | ✅ | Pure GSB. |
| Snowfall engine | NONE | Custom | ✅ | Pure GSB. |
| Status pill launcher (avatars+weather+CTA) | NONE | Custom | ✅ | Pure GSB. |
| Slide-in pill (scroll-reactive) | NONE | Custom | ✅ | Pure GSB. |
| Panel layouts (Side/Middle/Full) | NONE | Custom | ✅ | Pure GSB. |
| Embeddable search bar / button | NONE | Custom | ✅ | Pure GSB, standalone components. |
| Conditions table / webcam hero | NONE | Custom | ✅ | Pure GSB widget content. |

**Odin source:** `public-chatbot-configuration.md`

**Key insight:** ~7 fields are Odin-native (just expose), ~6 are adjacent/free
(Odin supports, not yet surfaced), and ~14 are pure GSB IP. The Appearance
Dashboard is genuinely ~half differentiation, half native exposure.

---

### E. Channels (multi-channel platform vision)

| Omni concept | Odin mapping | Type | Confidence | Notes |
|---|---|---|---|---|
| Chat channel (WEBSITE / FB Messenger / WhatsApp / SMS) | Agent + Public Chatbot integration | Native | ✅ | One agent serves multiple chat platforms (BotScrew handles platform routing). |
| Voice channel (VOICE_TWILIO) | Agent + Voice SDK | Native | ✅ | Odin Voice SDK; Twilio bridge is BotScrew's. |
| Email channel (Gmail) | Agent + Gmail toolkit | Native | ✅ | OAuth via Google Cloud. Native draft/reply/thread support. |
| Email channel (M365) | Agent + Microsoft 365 toolkit | Native | ✅ | OAuth via Azure AD. Native draft/reply/thread support. |
| Per-channel `platform` enum | BotScrew field | BotScrew | ✅ | WEBSITE, FB_MESSENGER, VOICE_TWILIO, future EMAIL. |
| Twilio voice telephony | NONE (BotScrew) | BotScrew | ✅ | Their bridge. |
| Multi-tenant OAuth app for M365 | NONE (GSB-owned) | Custom | ✅ | GSB's Azure app registration. Outside both Odin and BotScrew. |

**Odin source:** `gmail.md`, `microsoft-365.md`, `sdk-overview.md`

---

### F. Tool calling / Actions layer (the action layer)

The mechanism by which an agent *does things*, not just answers from the KB. Every
meaningful capability beyond "respond from indexed knowledge" is a tool call. This is
the operational backbone of any production agent and deserves design attention equal
to (or greater than) the knowledge layer.

**Conceptual map — four distinct flavors of tool calling in Odin:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ AGENT                                                                   │
│  ├── personality prompt (Section C)                                     │
│  ├── KB access  ────────  static reference content (Section B)          │
│  │                                                                      │
│  └── TOOLKITS  ─── this section ───                                     │
│       │                                                                 │
│       ├── Native Odin toolkits     (Odin built-ins)                     │
│       ├── Native integration       (OAuth-based: Gmail, M365, Slack)    │
│       ├── Custom Tools             (GSB-defined resort API endpoints)   │
│       └── Workflow Manager flows   (multi-step deterministic chains)    │
└─────────────────────────────────────────────────────────────────────────┘
```

#### F.1 Native Odin toolkits (engine-provided)

Toolkits Odin ships out of the box. Granted per-agent (different channels can enable
different sets). No code to write; just enable.

| Toolkit | Purpose for Omni / GetSkiBots | Per-channel decision |
|---|---|---|
| **Knowledge Base** | RAG retrieval from the project KB. Foundation for every channel. | Enable on all (chat, voice, email) — always. |
| **Web Search** | Live info beyond the KB (current events, news). | Enable on chat. Optional on voice (slower). Optional on email. |
| **Workflow Manager** | Multi-step deterministic workflows (see F.4). | Enable wherever booking/multi-step actions are needed. |
| **Database** | Query a SQL DB or Odin Smart Table directly. | Enable when a resort has structured data to query. |
| **Smart Table Manager** | CRUD on Smart Tables (lift status, pricing, schedules). | Usually admin-only; agents typically only read via Database toolkit. |
| **Document Manager** | Create/edit docs in-chat. | Rarely needed for ski; skip. |
| **Agent Communication** | Multi-agent delegation. | Future. Useful if a "concierge agent" hands off to a "booking agent." |
| Image Gen / Python / Node / To-Do | Not relevant for ski use cases. | Skip. |

**Substrate source:** `toolkits-overview.md`

#### F.2 Native integration toolkits (OAuth-based external services)

Toolkits that connect agents to external services via OAuth. Each requires a one-time
per-resort connection.

| Toolkit | Use case | Connection mechanism |
|---|---|---|
| **Gmail** | Email channel (read, draft, reply, thread, send). | OAuth via Google Cloud Console; per-resort consent. |
| **Microsoft 365** | Email channel (read, draft, reply, thread, send) + optionally calendar/files. | OAuth via Azure AD; **GSB's multi-tenant app** mediates this. |
| Slack | Internal alerting/notifications. | OAuth. Future. |
| Google Chat / Calendar / Drive | Internal productivity. | OAuth. Optional. |
| Salesforce / Jira / Confluence | CRM / ticketing / docs. | OAuth. Only if a resort uses them. |

**Substrate source:** `gmail.md`, `microsoft-365.md`

**GSB ownership note:** the multi-tenant Azure AD OAuth app for M365 is **GSB-owned
IP** living outside the Odin/BotScrew stack. Resorts connect their mailboxes via your
app's consent flow. Tokens stored in GSB infrastructure. This is one of the clearest
"owned edge" assets in the stack.

#### F.3 Custom Tools (resort API endpoints — the GSB action library)

GSB-defined tools that wrap **bespoke, per-resort HTTP endpoints custom-built by GSB
directly from each resort's data sources**. This is a foundational distinction:
there is no generic "ski resort API" — every resort's data lives in different
systems (WordPress sites, scraped feeds, vendor APIs like Snocountry, internal
operations databases, vendor booking platforms like Inntopia, etc.), and GSB
builds the integration layer per resort to expose a clean, agent-callable HTTP
endpoint.

**This is one of GSB's deepest moats:**

- Every new resort signed = a custom integration project (discover their data sources,
  build/wrap/scrape, normalize, host, maintain). This effort can take days to weeks
  per resort depending on the data complexity.
- Over time, GSB accumulates an integration library spanning dozens of resorts —
  this is the practical realization of "Yext for ski resorts": standardized
  agent-callable endpoints over the messy underlying systems each resort actually runs.
- Resorts can't easily switch off the GSB stack partly *because* GSB built and runs
  their data integration layer. That's defensible IP that grows per signed resort.
- It's also where genuine domain expertise compounds: knowing that JHMR's lift
  status lives in one system and Mtn Collective's pass-validation API lives in
  another is institutional knowledge competitors don't have.

**Conceptual flow:**

```
RESORT'S MESSY DATA LAYER (different per resort)
   ├── WordPress
   ├── Scraped pages
   ├── Snocountry API
   ├── Inntopia / vendor APIs
   └── Internal databases
              │
              ▼
GSB-BUILT INTEGRATION ENDPOINT (per resort, GSB-hosted)
   e.g. `https://api.getskibots.com/resorts/jhmr/lift-status`
              │
              ▼
ODIN CUSTOM TOOL (registered per agent)
   e.g. Tool name `get_lift_status` → HTTP GET → endpoint above
              │
              ▼
AGENT CAN INVOKE
```

The Odin layer just *registers* the HTTP call. **The integration substance — building
the endpoint, normalizing the resort's data, keeping it running as their underlying
systems change — is GSB-owned work, sitting outside both Odin and BotScrew.**

**The standardized tool catalog (each resort's specific endpoint URL varies):**

| Custom Tool | What it returns | Channel relevance |
|---|---|---|
| `get_snow_report` | 24h / 48h / 7d / season snowfall, base depth | All channels — guests always ask. |
| `get_lift_status` | Open lifts, closed lifts, hold status | All channels — "is the tram running?" |
| `get_parking_status` | Lot availability, recommended lot | Chat (mostly), voice on busy mornings. |
| `get_webcam` | Available cams with current image URLs | Chat (visual). Voice can describe. |
| `get_weather` | Temp, wind, conditions per location | All channels. |
| `get_trail_conditions` | Open/closed trails, grooming reports | All channels. |
| `get_events` | Upcoming on-mountain events | All channels. |
| `get_pricing` | Current ticket / pass prices | Chat, email (research). |
| `book_lesson` / `book_ticket` | Available products + reservation (via Inntopia) | Chat, email with confirmation. Voice with caution. |
| `check_availability` | Inntopia search step | Chat, email. |

**Substrate mechanism:** Odin **Custom Tools** (registration in the agent config), with the underlying
endpoint being a GSB-built integration. For multi-step booking flows: **Workflow Manager** (Section F.4).

**Substrate source:** `agents.md` (Custom Tools), `toolkits-overview.md`

**Design principle:** every piece of *currently changing* data (lift status, today's
snow, etc.) that's currently in a personality prompt as static text is a candidate
to be moved into a Custom Tool calling a GSB-built endpoint. The prompt becomes
"if asked about X, call `get_X`." Fresher data, lighter prompts, cleaner architecture,
and the per-resort integration work is amortized across every channel.

**Naming convention:** verb-led, snake_case (`get_*`, `book_*`, `check_*`, `cancel_*`).
This is what the LLM sees when deciding what to call. Same tool name across resorts
even though the endpoint URL is per-resort, so prompts and agent configurations
stay portable.

#### F.4 Workflow Manager (multi-step deterministic flows)

For actions that need multiple steps in a deterministic order (search → reserve →
confirm), use Workflow Manager rather than chaining single tool calls. Workflows
can include user-facing confirmations and approval gates.

| Workflow | Steps | Use case |
|---|---|---|
| Lesson booking | `check_availability` → present options → user confirms → `book_lesson` → email confirmation | Chat, email |
| Lift ticket purchase | `get_pricing` → `check_availability` → user confirms → `purchase` → email receipt | Chat |
| Group quote | `get_pricing` → assemble line items → email quote draft → human approval gate | Email |
| Refund / cancellation | `lookup_booking` → confirm with user → `cancel_booking` → email confirmation | All channels with approval gate |

**Substrate source:** Workflow Manager toolkit (`toolkits-overview.md`).

**Approval gates** are first-class in Odin: any tool or workflow can be marked
`requiresApproval: true` so the agent presents the action to the user before
executing. Essential for payments, cancellations, and email sends in production.

#### F.5 Per-channel tool calling differences

Same shared KB, but different channels may want different tools enabled. Typical pattern:

| Channel | Typical tool set |
|---|---|
| **Chat** | KB + Custom Tools (full set) + Workflow Manager (booking flows) + optional Web Search |
| **Voice** | KB + Custom Tools (only short-response ones — skip ones returning long lists) + minimal Workflow Manager |
| **Email** | KB + Custom Tools + Workflow Manager + **Gmail/M365 toolkit** (draft-first send policy) |

This is configured at the **Agent level** in Odin — each channel's agent toggles
which toolkits are enabled.

#### F.6 Mapping to Omni's existing flows

Omni's `parent.ts` already has a `flows` array (`get_snow_report`, `get_lift_status`,
etc.). Today these may be prompt-pattern based rather than real tool calls. The
alignment goal: every entry in `flows` becomes a real Odin Custom Tool with:

- A unique snake_case name
- A documented endpoint (resort API or wrapped Smart Table query)
- A typed input/output schema
- A per-channel "enabled" flag
- Optional `requiresApproval` for sensitive ones

This is the upgrade path from "prompt with stuffed data" to "agent with real tools."

#### F.7 Implications for the Omni Knowledge page redesign

The current BotScrew Knowledge page has four layers (Instructions / Text Edits / Files
/ Website). Omni should add a **fifth layer: Tools** (or "Actions"). This becomes the
substrate-aware way to show the agent's full capability surface:

```
KNOWLEDGE LAYERS (shared across all channels)
  • Instructions (per-channel — see Channels tab)
  • Text Edits        ─┐
  • Files              ├─ static reference content (KB)
  • Website            ─┘
  • Tools / Actions   ── live operational data (Custom Tools + Workflows)
```

Each Tool is a row showing: name, endpoint, last-called timestamp, which channels
have it enabled, whether approval is required. The user (resort admin) edits tools
the same way they edit KB content — once at the resort level, every channel agent
inherits it.

#### F.8 Open questions for BotScrew

- ❓ Can BotScrew's wrapper register **Odin Custom Tools** that call **arbitrary
  GSB-hosted HTTP endpoints** (with auth headers, JSON schema, error handling)?
  This is the core integration capability needed for the per-resort tool library.
- ❓ Does the wrapper support **per-channel toolkit selection** (different tools enabled
  for chat vs. voice vs. email agents), or is it bot-wide today?
- ❓ Is **Workflow Manager** wired up (for multi-step flows like booking with confirmation),
  or only single-call tools?
- ❓ How does the wrapper handle **per-tool auth** — can GSB pass an API key or token per
  tool registration so resort endpoints stay properly secured?
- ❓ Can tool definitions (name, endpoint, schema) be **versioned** the same way agent
  configs are? Important for safe rollouts of integration changes.
- ⚠️ Verify: are GSB's existing resort feeds currently wired as real Odin Custom Tools,
  or fetched at prompt-build time and stuffed into the system prompt as static text?
  (Critical to know before specifying the Knowledge page redesign.)

---

### G. Behavior / runtime settings

| Omni concept | Odin mapping | Type | Confidence | Notes |
|---|---|---|---|---|
| Sound notifications | ❓ likely BotScrew chat runtime | BotScrew | ⚠️ | Verify with Daria. |
| Rating after conversation | BotScrew (ratingDistribution endpoint exists) | BotScrew | ✅ | Their analytics already collects this. |
| Disable text input | ❓ likely BotScrew chat runtime | BotScrew | ⚠️ | Verify. |
| Pop-up message preview | partial — Odin has welcome delay | Adjacent | ⚠️ | |
| Working hours / live agent handoff | BotScrew (their support module) | BotScrew | ✅ | Their support state machine. |

---

### H. Analytics

| Omni concept | Odin mapping | Type | Confidence | Notes |
|---|---|---|---|---|
| Active users / conversations | BotScrew analytics endpoint | BotScrew | ✅ | `/api/private/bot/{id}/usersStatistics` |
| Support / handoff metrics | BotScrew analytics endpoint | BotScrew | ✅ | `supportStatistics` |
| Rating distribution | BotScrew analytics endpoint | BotScrew | ✅ | `ratingDistribution` |
| Funnels | BotScrew analytics endpoint | BotScrew | ✅ | `funnels` |
| Comments / feedback | BotScrew analytics endpoint | BotScrew | ✅ | `comments` |
| Channel filtering (`allChannels`) | BotScrew analytics param | BotScrew | ✅ | Already channel-aware. |
| Conversation export | BotScrew CSV export | BotScrew | ✅ | See `BOTSCREW_DATA.md`. |

**No Odin involvement** — analytics is computed by BotScrew over conversation
data they store. Omni analytics is "mirror BotScrew's endpoints, extend with
channel segmentation."

---

### I. Infrastructure layer (where things physically live)

| Element | Location | Implication for Omni |
|---|---|---|
| Odin NLP service | BotScrew's AWS EC2 (on-prem install) | No direct access. All routes through BotScrew API. |
| Front-end + Back-end | BotScrew's AWS EC2 | Their dashboard, their build. |
| MongoDB / MySQL | BotScrew's AWS EC2 | Stores agent config, bot records, etc. |
| Redis | BotScrew's AWS EC2 | Session cache. |
| Pinecone (Vector DB) | 3rd-party SaaS (BotScrew's account) | KB embeddings. Inaccessible to Omni. |
| OpenAI | 3rd-party SaaS | GSB's API keys, called from BotScrew's stack. |
| GSB OAuth app (M365) | GSB-owned infrastructure | Outside the VPC; entirely yours. |
| GSB widget runtime | TBD (could be GSB-hosted) | Display code; substrate-agnostic. |
| Omni itself | GSB-hosted (Vercel) | Design + spec system; doesn't touch BotScrew runtime. |

---

## Part 3: How to use this when building any new Omni page

When you (or Claude Code) starts a new Omni page, work through these steps:

**Step 1 — Identify the core nouns.** What objects does this page operate on?
Resort? KB sources? Agents? Channels? Look them up in Part 2 to find the Odin mapping.

**Step 2 — Classify each control / feature by type.**
For every UI control on the page, label it Native / Adjacent / Extends / Custom / BotScrew.
This becomes the "what is this really" filter.

**Step 3 — Cite the substrate source.**
For Native and Adjacent items, cite which Odin `.md` documents the capability.
This is the credibility anchor for any spec sent to BotScrew.

**Step 4 — Identify the "free wins."**
Look for Odin-native fields you haven't surfaced yet (e.g., Display Sources,
Enable Multiple Chats, Pre-Chat Image behavior enum). These are zero-cost adds.

**Step 5 — Identify the open questions.**
For each ❓ or ⚠️ in the table, flag it for Daria. Add to the page's
`04-questions.md` in the handoff folder.

**Step 6 — Update the alignment file.**
Write `docs/alignment/<page-name>.md` capturing the page's substrate map.
This is the artifact that keeps Omni honest as it grows.

---

## Part 4: Handoff package format (operational)

For every page Omni hands to BotScrew, the package in `docs/handoff/<page>/`:

| File | What it contains | Owner |
|---|---|---|
| `README.md` | One-paragraph summary, prototype URL, how to use this folder | GSB |
| `prototype-url.txt` | Link to the clickable prototype | GSB |
| `01-design-intent.md` | 2-page spec: problem, model, what's new, why | GSB |
| `02-data-model.md` | Types and fields, shared vs. per-channel (Odin terms hidden) | GSB |
| `03-behaviors.md` | Interactions + edge cases as a bulleted list | GSB |
| `04-questions.md` | Open questions Daria/BotScrew need to confirm | GSB → BotScrew |
| `reference/` | Screenshots, walkthrough video | GSB |

**Critical naming rule:** in handoff files, use product language — Resort, Knowledge
Base, Channels, Agent Instructions. Do NOT use Odin terms (Project, KB, Agent) even
though they're more accurate. This keeps your alignment knowledge private while
still giving BotScrew everything they need to build.

---

## Part 5: Substrate sources (quick reference)

When citing Odin in alignment files, point to:

```
Knowledge Base model        → docs/reference/odin-md/kb-overview.md
Agents model                → docs/reference/odin-md/agents.md
SDK / connection config     → docs/reference/odin-md/sdk-overview.md
Toolkits inventory          → docs/reference/odin-md/toolkits-overview.md
Public chatbot appearance   → docs/reference/odin-md/public-chatbot-configuration.md
Email — Gmail               → docs/reference/odin-md/gmail.md
Email — Microsoft 365       → docs/reference/odin-md/microsoft-365.md
Master Odin doc index       → docs/reference/odin-md/llms.txt
```

To refresh from live Odin docs, fetch from `https://learn.getodin.ai/llms.txt`
and re-snapshot any pages that have changed.

---

## Part 6: Three things this structure deliberately enforces

1. **Every Omni feature is traceable to a substrate source or labeled as GSB IP.**
   No mystery features. No "we'll figure out how this maps later." Always know
   if you're spec'ing native exposure, an extension, or pure differentiation.

2. **The handoff package is consistent across every page.** BotScrew opens any
   `handoff/<page>/` folder and finds the same five files in the same order.
   That predictability accelerates their build and reduces back-and-forth.

3. **Odin knowledge stays private; product knowledge ships.** The `alignment/`
   and `reference/` folders are GSB-internal. Only `handoff/` goes to BotScrew,
   and it uses product language, not substrate language.

---

## Part 7: First three pages to align (priority order)

1. **Knowledge page** — replaces the current single-agent Instructions/Text Edits/Files/Website
   view with shared KB + per-channel agents. **Adds a fifth layer: Tools / Actions** —
   moving live operational data (lift status, snow, parking) out of personality prompts
   and into Custom Tool calls (Section F). Highest priority; the Omni thesis made concrete.
2. **Appearance tab** — already partially specced from the Daria quote work; aligns
   to `public-chatbot-configuration.md`. Maps 7 native fields + 6 free wins +
   14 custom GSB enhancements.
3. **Channels page** — the multi-channel configuration view; aligns to multi-agent
   model from `agents.md`. Defines how chat / voice / email each get their own
   agent over the shared KB, **including per-channel toolkit selection** (Section F.5).

After those three, the alignment work for analytics, support, and triggers
follows the same pattern.

**Cross-cutting priority — the Actions layer migration:**

Independent of any single page, the highest-leverage architectural improvement is
moving every piece of currently-changing data out of prompts and into real tool
calls (Section F.3, F.6). This affects the Knowledge page UI but also the Channels
page (per-channel tool enablement) and is worth a dedicated open question to
BotScrew (Section F.8) before locking specs.
