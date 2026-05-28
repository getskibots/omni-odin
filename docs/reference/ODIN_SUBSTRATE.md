# Odin Substrate Reference

The bedrock the GetSkiBots stack sits on. BotScrew is a ski-agnostic wrapper over
**Odin AI** (getodin.ai); your bots run as Odin agents, with inference on your own
OpenAI keys. This document captures the Odin model and contracts that everything
downstream (Omni, BotScrew specs, the email channel) should be designed against.

Companion doc: `BOTSCREW_DATA.md` (the egress / conversation-export side).
This doc is the substrate; that doc is the data coming back out of it.

> Confidence note: Odin = Odin AI is confirmed (the `odinConfigs`/`odinId` in the live
> bot data match Odin's SDK fields exactly). How thickly BotScrew wraps Odin is inference.
> Sourced from learn.getodin.ai public docs, May 2026. The published SDK package is
> named `@odin-ai-staging/sdk` (note "staging").

---

## 1. The core model: Project → Knowledge Base → Agents

This is the single most important fact for Omni's unification design.

```
PROJECT  (= a resort / the "parent")
  ├── KNOWLEDGE BASE   (ONE shared KB per project — the unification layer)
  │      files · web crawl · documents · templates · smart tables · connectors
  ├── AGENT: chat      (own prompt + model, draws on the shared KB)
  ├── AGENT: voice     (own prompt + model, draws on the shared KB)
  └── AGENT: email     (own prompt + Gmail/M365 toolkit, draws on the shared KB)
```

- The **Project** is the fundamental container: "a secure, isolated container for all
  resources related to a specific business function." It holds Agents, Knowledge Bases,
  Documents, and Databases, with its own settings, permissions, and quotas.
- The **Knowledge Base** is "the centralized repository" — knowledge specific to the
  workspace. **One KB serves all agents in the project.** This is why unification is
  native: update the KB once, every channel/agent sees it.
- Each **Agent** is a channel: its own personality prompt, model, and toolkits, but
  pointing at the same project KB.

**Mapping to GetSkiBots / Omni:**
| Omni concept | Odin substrate |
| --- | --- |
| Resort (parent) | Project |
| Shared resort knowledge | Project Knowledge Base |
| Chat channel | Agent (chat) |
| Voice channel | Agent (voice) |
| Email channel | Agent + Gmail/M365 toolkit |
| Channel overlay (prompt/tone) | Agent personality prompt + model |
| Resort FAQ patterns | KB Templates (Q&A pairs) |
| Resort API feeds (lift status, etc.) | Custom Tools / Workflow Manager toolkit |

**Open question that determines unification effort:** are a resort's existing separate
BotScrew chat bot and voice bot two *agents in one Odin project* (already sharing a KB,
just surfaced as two bots) or two *separate Odin projects* (duplicated KB)? If same
project → unification is mostly a dashboard problem. If separate projects → knowledge is
duplicated and unification means consolidating projects. Confirm by checking whether the
two bots share an Odin `projectId`.

---

## 2. Platform architecture (Odin's four layers)

Odin describes itself as a modular four-layer system:

1. **Core Intelligence Layer** — the selected LLM (GPT-5 series, Claude 4, Gemini 3,
   etc.). The "brain." This is where YOUR OpenAI keys plug in (model = gpt-5.2 in prod).
2. **Tooling Layer** — native toolkits (code exec, web, DB, files). The "arms and legs."
3. **Integration Layer** — pre-built connectors (M365, Google Workspace, Salesforce, Jira…).
4. **Orchestration Layer** — manages the interaction lifecycle: auth, error recovery,
   state, multi-agent delegation.

For GetSkiBots: you own Layer 1's keys; BotScrew's wrapper sits above all four and adds
ski-specific routing, telephony (Twilio), billing, and analytics.

---

## 3. The connection contract (SDK config)

Every Odin SDK (Chat / Voice / SmartTables) initializes with the same shape. This is the
full version of what BotScrew stores as `odinConfigs`:

```typescript
{
  baseUrl:    'https://api.getodin.ai/',   // Odin API endpoint
  projectId:  'your-project-id',           // the project (= resort)
  apiKey:     'your-api-key',              // from My Account > API Keys
  apiSecret:  'your-api-secret',           // secret — env var, never commit
  agentId:    'voice-agent-id'             // optional; the specific agent/channel
}
```

Alternate auth for web apps: `accessToken` instead of apiKey/apiSecret (client-side,
uses an existing user session).

**What BotScrew's `odinConfigs` exposed (from live bot 248):**
- `projectId` → the Odin project
- `recognitionProvider: "OPEN_AI"` → Odin's model/provider selector
- (the `<odinId>` in the config XML → the Odin agent ID)

**Access requires apiKey + apiSecret**, which BotScrew holds. Knowing a `projectId`
alone is not access.

---

## 4. The three SDKs

One package, `@odin-ai-staging/sdk`. Each maps to part of the Omni model.

### ChatSDK — the chat-family channels (WEBSITE, FB_MESSENGER, future SMS/WhatsApp)
- `createChat(name)`, `listChats(cursor, size)` (paginated, `has_more`/`next_cursor`)
- `sendMessage(text, { chatId, agentType, agentId })` → returns `Message`
- `sendMessageStream(text, { chatId, onChunk, onComplete })` — streaming
- Knowledge base integration, file uploads, user feedback (thumbs up/down)
- Types: `Chat`, `Message`, `SendMessageOptions`
- A message can target a specific `agentId` and `agentType: 'chat_agent'`

### VoiceSDK — the voice channel (VOICE_TWILIO)
- `startVoiceConversation({ saveToChat, callbacks })` → `sessionId`
- callbacks: `onConnect`, `onMessage`, `onTranscription(text, isFinal)`
- React hook `useVoiceConversation({ sdkConfig, callbacks })` → `{ status, startSession, endSession }`
- Real-time, auto transcription, audio visualization, session management
- `saveToChat: true` persists the voice session as a chat → likely how voice
  transcripts end up in the export data

### SmartTablesSDK — structured resort data (lift status, pricing, schedules)
- `createTable(name, desc)`, `addColumn(tableId, {name, type, notNull, unique})`
- `queryTable(tableId, { filters:[{column,operator,value}], pagination:{limit,page} })`
- CSV/Excel import-export, AI-powered column computation
- Useful as a structured data store an agent can read (e.g., a resort facts table)

---

## 5. Toolkits (agent capabilities)

Toolkits extend an agent. The ones relevant to GetSkiBots:

| Toolkit | Use for GetSkiBots |
| --- | --- |
| **Knowledge Base** | RAG retrieval from the resort KB. The core of every channel. |
| **Web Search** | Real-time info beyond the KB. |
| **Workflow Manager** | Deterministic workflows = your "AI Actions" / resort API flows. |
| **Database** | Query SQL / Smart Tables (resort structured data). |
| **Smart Table Manager** | Manage the structured resort data tables. |
| **Document Manager** | Create/edit docs in-chat. |
| **Agent Communication** | Multi-agent delegation (advanced; future). |
| Image Gen / Python / Node / To-Do | Not core to current ski use cases. |

**Email is NOT a channel toolkit in this list — it's an external integration** (next section).

---

## 6. Email = external integration (Gmail / Microsoft 365)

Email is not a native "channel" like the web chat widget or voice. It's an **agent
integration** via Gmail or M365, both OAuth-based, both with full draft-first support.

### Gmail toolkit
- OAuth 2.0 via Google Cloud Platform (Gmail API enabled, OAuth consent).
- Operations: search, get content, send, reply (maintains thread history), forward,
  and draft management — **create draft, update draft, send draft, list drafts**.
- Documented use cases match "Sendy": automated KB-grounded replies, email monitoring
  by keyword/sender triggering workflows, support routing by content classification.

### Microsoft 365 toolkit (fatter — email + calendar + OneDrive/SharePoint + contacts)
- OAuth 2.0 via Azure AD App Registration: Client ID, Client Secret, Tenant ID.
- Email ops: search, send, reply/reply-all (thread context), forward, get content,
  move between folders, create drafts, mark read/unread.

**GetSkiBots' email advantage (owned IP):** you built a **GetSkiBots multi-tenant Azure
OAuth app** so resorts connect their own `support@theirresort.com` via consent — one app
you control, many resort mailboxes. This is the hard, defensible part of the email
channel, and it lives in YOUR infrastructure (outside BotScrew/Odin).

**Watch items for email:**
- M365 mailbox scopes usually require **admin consent** per resort tenant (a one-time
  org approval, not per-user).
- Your Azure app should be **publisher-verified** so resort admins don't see "unverified
  publisher" warnings.
- Where the OAuth **refresh tokens** are stored determines who controls email
  connections (you vs. BotScrew). If yours → strongest position.

**Email modeling rule for Omni:** model email as a **toolkit-backed agent capability with
a provider choice (Gmail | M365) and an OAuth connection**, distinct from the real-time
channel pipes (web/voice). Default send policy = **draft for human review**, auto-send
only on an explicit per-resort allowlist.

---

## 7. Public Chatbot config (the web widget)

Odin's native public-chatbot settings — this is what BotScrew's Appearance Dashboard
skins. Knowing the native shape means Omni's appearance config maps 1:1.

Native appearance fields (Appearance tab → Content + Interface):
- **Content:** Chatbot Name, Welcome Message, Input Placeholder, Suggestions
  (one per line), **Default Agent** (dropdown — which agent answers).
- **Interface:** Font Size (px), Message Bubble/Header Color (hex), Toggle Icon Color,
  Text Color, Caret Background Color, welcome-message delay (-1 disables), Enable
  Multiple Chats (toggle), **Display Sources** (toggle), Pre-Chat Attention Image +
  behavior (always / never / every 24h), Toggle Button Image, Widget Header Image.
- Tabs: **Appearance**, **Integrations**, **Teams App**. Save / Reset to Default.

Integration targets (where the chatbot embeds): website (window/bubble, across React/
Next/Angular/WordPress), Slack, Google Chat. (No native email channel — see §6.)

---

## 8. Agent configuration (the channel overlay, in detail)

Per-agent settings = your channel overlay:
- **Agent Name** + icon (branding)
- **Personality Prompt** (the system instruction — role, task, constraints, format,
  tooling guidance). This is the channel's tone/behavior overlay.
- **Model selection** (multi-model; gpt-5.2 in prod, but supports Claude/Gemini/etc.)
- **Response format:** Text or JSON Object (structured outputs via JSON schema)
- **Toolkits** toggled per agent
- **Custom Tools** (proprietary API actions, optional approval workflow) = resort API feeds
- **MCP Servers** (external tools via Model Context Protocol)
- **Agent Memory** (per-user, approval-gated — remembers preferences/context)
- **Prompt Library** (saved prompt templates surfaced in the input)
- **Version History** (config audit trail, rollback, user attribution)

Two creation paths: **Create from Prompt** (AI-assisted) or **Create Custom Agent**
(manual, full control — the production path).

---

## 9. Knowledge Base ingestion (how shared knowledge gets in)

Maps directly to Omni's Knowledge page tabs:

| Ingestion path | Omni equivalent |
| --- | --- |
| **Web Crawler** (crawls a domain, scheduled re-sync) | "Website" sync tab |
| **File upload** (PDF/DOCX/etc.) | "Files" tab |
| **Documents** (text created in-KB) | "Text Edits" tab |
| **Templates** (FAQ / response / example pairs) | resort FAQ patterns |
| **Connectors** (Google Drive, SharePoint, Confluence, SQL DBs) | future integrations |
| **Smart Tables** (structured extraction) | structured resort data |

KB processing config (per project): **chunking strategy** (sentence vs. semantic),
chunk size (default 64, rec. 64–512 tokens), overlap (default 16), and optional
**chunk enrichment** (LLM-enhanced). Embedding model must stay consistent between
indexing and querying. Sync & schedule controls auto-refresh.

Per-document: View / Content / Chunks tabs, custom metadata, access tags, and
**Associated Questions** (improves retrieval).

---

## 10. What this means for Omni (design rules)

1. **Design Omni's types to the substrate nouns:** Project, Knowledge Base, Agent,
   Toolkit, Chat/Session, Smart Table. Not to BotScrew's UI, not to invented names.
2. **One Project = one Resort = one shared KB.** Channels are Agents on top. This is the
   unification model; Omni should express it directly.
3. **Channel overlay = Agent (prompt + model + toolkits)**, not a text fragment to
   concatenate. The KB is shared; the agent config differs per channel.
4. **Email is a toolkit + OAuth**, modeled separately from real-time pipes; provider =
   Gmail | M365; default = draft-for-review.
5. **Tag every Omni field by owning layer:** yours (prompts, ski config, OAuth, OpenAI
   keys) vs. Odin (KB, agents, sessions) vs. BotScrew (bot registry, billing, routing,
   analytics). Design freely in your layers; only *reference* the others.
6. **Two reference docs underpin the build:** this (`ODIN_SUBSTRATE.md`) for the engine
   model, `BOTSCREW_DATA.md` for the conversation/export data shapes.

---

## 11. Strategic notes (hold privately)

- Odin offers **API Keys** (server-side), **custom app-like interfaces**, and
  **on-premise** deployment. So building a custom frontend over Odin is an intended use
  case — the basis of GetSkiBots' optionality.
- Odin is **LLM-agnostic**; the model layer is configurable / bring-your-own-key, which
  is why your OpenAI keys are the inference layer.
- "Build in my own Odin project, then move to BotScrew's" is a **recreation/migration**,
  not a pointer swap — BotScrew's wrapper binds to *their* project IDs, billing, routing,
  and your OAuth/token layer doesn't cleanly transplant. Good as a *prototype/blueprint*
  strategy; weak as a literal deploy pipeline.
- Don't reveal depth of this knowledge to BotScrew. Let it sharpen questions, not become
  assertions.
