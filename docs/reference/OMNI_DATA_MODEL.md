# Omni Data Model Spec (Odin-Aware)

The canonical data model for Omni, designed directly against the Odin substrate. Every
type here mirrors an Odin concept (Project / Knowledge Base / Agent / Toolkit / Session)
and is tagged by which layer **owns** it, so the model fits reality and hands off cleanly.

**Built on two reference docs (read those first):**
- `ODIN_SUBSTRATE.md` — the engine model (Project → KB → Agents, SDK shapes, toolkits, email)
- `BOTSCREW_DATA.md` — the conversation/export data shapes (platform enum, outcomes, fields)

**Layer ownership legend** (used throughout as `@layer`):
- `@gsb` — GetSkiBots owns it (prompts, ski config, OAuth, OpenAI keys). Design freely.
- `@odin` — Odin owns it (KB, agents, sessions). Mirror its shape; we reference it.
- `@botscrew` — BotScrew's wrapper owns it (bot registry, billing, routing, analytics). Reference only.

> The golden rule: design freely in `@gsb` fields, mirror `@odin` shapes accurately,
> and only *reference* `@botscrew` fields (never invent or assume we control them).

---

## 1. The model at a glance

```
Resort (Project)                         @gsb identity wrapping an @odin project
  │
  ├── KnowledgeBase  (ONE, shared)       @odin — the unification layer (static content)
  │     sources[] · templates[] · smartTables[]
  │
  ├── Action Library (shared)            @gsb — live operational data + workflows
  │     customTools[] · workflows[]      (per-resort GSB-built HTTP endpoints)
  │
  ├── Channel: chat   → Agent            @gsb overlay over an @odin agent
  ├── Channel: voice  → Agent            @gsb overlay over an @odin agent
  └── Channel: email  → Agent + Toolkit  @gsb overlay + @gsb OAuth + @odin toolkit
        │
        ├── selects which Tools/Workflows it has access to (per-channel)
        └── binds to a BotScrew bot record (@botscrew) for production
```

One Resort = one Project = one shared KnowledgeBase + one shared Action Library
+ N Channels (agents).

- **KnowledgeBase** = static reference content (FAQ, web crawl, files). Update once,
  every channel sees it.
- **Action Library** = live operational data via GSB-built per-resort HTTP endpoints
  (lift status, snow, parking, bookings). Update once, every channel can call it.
- **Channels** = per-channel agent config (prompt + model + which toolkits/tools/workflows
  this channel is allowed to use).

That is unification, native to the substrate.

---

## 2. Enums and primitives

```typescript
// --- Channel identity ------------------------------------------------------

/** BotScrew's per-conversation channel key (@botscrew / @odin observed values). */
export type Platform =
  | 'WEBSITE'        // chat family — web widget
  | 'FB_MESSENGER'   // chat family — Facebook Messenger
  | 'VOICE_TWILIO'   // voice
  | 'EMAIL';         // future — pending BotScrew enum support

/** Omni's channel grouping. Multiple platforms can roll up to one family. */
export type ChannelFamily = 'chat' | 'voice' | 'email';

export function channelFamily(p: Platform): ChannelFamily {
  if (p === 'VOICE_TWILIO') return 'voice';
  if (p === 'EMAIL') return 'email';
  return 'chat'; // WEBSITE, FB_MESSENGER, future WhatsApp/SMS
}

// --- Conversation outcomes (@botscrew export; see BOTSCREW_DATA.md) ---------

/** NOTE: dictionary says 'RESOLVED' but live data uses 'SOLVED'. Alias on ingest. */
export type ConversationOutcome =
  | 'UNENGAGED' | 'SOLVED' | 'ESCALATED' | 'ABANDONED' | 'UNRESOLVED' | 'FAILED';

/** Support / live-agent handoff state machine (@botscrew). */
export type RequestStatus =
  | 'none' | 'open' | 'assigned' | 'pending' | 'closed' | 'expired';

export type SenderType = 'USER' | 'BOT' | 'SUPPORT';

// --- Email provider (@gsb owns the connection; @odin owns the toolkit) ------

export type EmailProvider = 'GMAIL' | 'MICROSOFT_365';
export type EmailSendPolicy = 'DRAFT' | 'AUTO' | 'AUTO_WITH_ALLOWLIST';
```

---

## 3. Resort  (= Odin Project)  `@gsb` wrapping `@odin`

The parent. GetSkiBots identity and ski metadata, wrapping a reference to the underlying
Odin project and the BotScrew account it lives under.

```typescript
export interface Resort {
  // --- @gsb: our identity for the resort -----------------------------------
  resortId: string;              // our stable slug, e.g. "cranmore"
  displayName: string;           // "Cranmore Mountain Resort"
  brand: ResortBrand;            // colors, logo, fonts (the ski layer)
  region?: string;
  passAffiliations?: string[];   // e.g. ["mountain-collective", "ikon"]

  // --- @odin: the substrate binding ----------------------------------------
  odinProjectId: string;         // the Odin Project this resort maps to
  // ^ THE unification key: channels sharing this projectId share the KB.

  // --- @botscrew: account/registry binding ---------------------------------
  botscrewAccountRef?: string;   // which BotScrew account/tenant owns it

  // --- composed children ---------------------------------------------------
  knowledgeBase: KnowledgeBase;  // ONE shared KB (Odin project-level)
  actionLibrary: ActionLibrary;  // ONE shared action library (GSB-owned)
                                 //   per-resort built HTTP endpoints + workflows;
                                 //   channels reference these by name + opt in.
  channels: Channel[];           // chat / voice / email agents

  updatedAt: string;
}

/**
 * @gsb — The shared per-resort action library. Custom Tools (HTTP endpoints
 * GSB has built for THIS resort) and Workflows (multi-step flows). Defined once
 * at the resort level; channels reference by name + enable per-channel.
 * See §5b below for the types. See ALIGNMENT §F for the substrate framing.
 */
export interface ActionLibrary {
  customTools: CustomToolRef[];
  workflows: WorkflowRef[];
}

/** @gsb — the ski brand system (crimson, Fraunces, etc.). Purely ours. */
export interface ResortBrand {
  primaryColor: string;          // hex, e.g. "#a8201a"
  secondaryColor?: string;
  logoUrl?: string;
  headerImageUrl?: string;
  fonts?: { serif?: string; sans?: string; mono?: string };
}
```

---

## 4. KnowledgeBase  (= Odin project KB)  `@odin` — the unification layer

ONE per resort. Shared across all channels. Mirrors Odin's KB ingestion model
(see ODIN_SUBSTRATE.md §9). Omni edits this once; all channels inherit.

```typescript
export interface KnowledgeBase {
  // @odin — belongs to the Odin project
  odinProjectId: string;         // same as Resort.odinProjectId (the shared KB)

  sources: KnowledgeSource[];    // crawl / files / documents / connectors
  templates: KnowledgeTemplate[];// FAQ / response / example pairs
  smartTables: SmartTableRef[];  // structured resort data (lift status, pricing)

  // KB processing config (Odin project-level settings)
  chunking?: {
    strategy: 'sentence' | 'semantic';
    chunkSize?: number;          // default 64, rec. 64-512 tokens
    chunkOverlap?: number;       // default 16
    enrichment?: boolean;        // LLM-enhanced chunking
  };
  lastSyncedAt?: string;
}

export type KnowledgeSourceType =
  | 'WEB_CRAWL'    // Odin web crawler  → Omni "Website" tab
  | 'FILE'         // upload            → Omni "Files" tab
  | 'DOCUMENT'     // in-KB text        → Omni "Text Edits" tab
  | 'CONNECTOR';   // Drive/SharePoint/SQL/etc.

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  label: string;
  // type-specific:
  url?: string;                  // WEB_CRAWL / CONNECTOR
  fileName?: string;             // FILE
  syncSchedule?: string;         // cron-ish, for crawl/connector refresh
  status?: 'OK' | 'SYNCING' | 'FAILED';
}

/** Odin KB Templates — maps to resort FAQ patterns (e.g. JHMR Q&A set). */
export interface KnowledgeTemplate {
  id: string;
  kind: 'FAQ' | 'RESPONSE' | 'EXAMPLE';
  question?: string;             // FAQ
  content: string;
  associatedSourceId?: string;   // optional KB file for extra context
}

export interface SmartTableRef {
  odinTableId: string;
  name: string;                  // e.g. "Lift Status", "Pricing"
  description?: string;
}
```

---

## 5. Channel  (= Odin Agent + binding)  `@gsb` overlay over `@odin` agent

A channel is one Odin agent (its prompt + model + toolkits) drawing on the shared KB,
plus the BotScrew bot record it deploys to. This replaces the old "text overlay" idea:
the overlay IS the agent config.

```typescript
export interface Channel {
  // --- @gsb: our channel identity ------------------------------------------
  channelId: string;             // our id, e.g. "cranmore-voice"
  family: ChannelFamily;         // chat | voice | email
  platforms: Platform[];         // which platform value(s) this channel serves
  //  chat → ['WEBSITE','FB_MESSENGER', ...]; voice → ['VOICE_TWILIO']; email → ['EMAIL']

  // --- @odin: the agent (this is the channel overlay) ----------------------
  agent: AgentConfig;            // prompt + model + toolkits, on the shared KB

  // --- @botscrew: production binding ---------------------------------------
  botscrewBotId?: number | null; // their integer bot id (101, 248, …); null if unwired

  // --- channel-specific blocks (only one applies) --------------------------
  chat?: ChatChannelConfig;
  voice?: VoiceChannelConfig;
  email?: EmailChannelConfig;

  status: 'ACTIVE' | 'DRAFT' | 'DISABLED';
}

/** @odin — the agent config; the substance of the channel overlay. */
export interface AgentConfig {
  odinAgentId?: string;          // @odin — the agent id (null until created)
  name: string;
  personalityPrompt: string;     // @gsb — WE author this (the system prompt)
  model: string;                 // e.g. "gpt-5.2" (@gsb selects; runs on our OpenAI key)
  responseFormat?: 'TEXT' | 'JSON';
  toolkits: ToolkitId[];         // which Odin toolkits this channel has access to
  memoryEnabled?: boolean;

  // Action library access — channels don't OWN tools/workflows (those live at
  // the resort level in resort.actionLibrary). Each channel just picks which
  // ones it's allowed to use. To resolve: filter resort.actionLibrary.customTools
  // and resort.actionLibrary.workflows by membership in these arrays, AND by
  // their own `enabledOnChannels` flag.
  enabledCustomToolIds?: string[];   // CustomToolRef.id values
  enabledWorkflowIds?: string[];     // WorkflowRef.id values
}

// =========================================================================
// 5b. Action layer  —  tools, integrations, custom resort APIs, workflows
//                     (Substrate ref: ODIN_SUBSTRATE.md §5; alignment §F)
// =========================================================================
//
// An agent has access to three kinds of "tools" beyond its KB:
//
//   1. Native Odin toolkits (engine-provided)        → ToolkitId enum
//   2. OAuth integration toolkits (Gmail / M365)     → ToolkitId enum (subset)
//   3. Custom Tools (per-resort GSB-built endpoints) → CustomToolRef[]
//   4. Workflows (multi-step deterministic flows)    → WorkflowRef[]
//
// Toolkits are enabled per agent (per channel). Custom Tools and Workflows
// are usually defined at the Resort level (shared across channels) and
// referenced from each channel's AgentConfig with a per-channel enabled flag.

/** Which Odin toolkit. Enabled per agent. @odin */
export type ToolkitId =
  // Native engine toolkits
  | 'KNOWLEDGE_BASE'        // RAG retrieval — always enable
  | 'WEB_SEARCH'            // live web search
  | 'WORKFLOW_MANAGER'      // executes Workflows defined below
  | 'DATABASE'              // SQL / Smart Table query
  | 'SMART_TABLE_MANAGER'   // CRUD on Smart Tables (admin-ish)
  | 'DOCUMENT_MANAGER'      // create/edit docs in-chat
  | 'AGENT_COMMUNICATION'   // multi-agent delegation
  // OAuth integration toolkits
  | 'GMAIL'                 // email channel — Gmail
  | 'MICROSOFT_365';        // email channel — M365 (+ optionally calendar/files)

/**
 * @gsb — A bespoke, per-resort HTTP endpoint custom-built by GSB and registered
 * as an Odin Custom Tool. This is the action layer that lets a ski agent
 * actually do things: fetch lift status, snow report, parking, webcams, etc.
 *
 * IMPORTANT — resort APIs are GSB-built per resort:
 * Every resort's lift-status / snow / parking endpoint is a separate integration
 * that GSB builds from that resort's underlying data systems (WordPress,
 * scraped feeds, Snocountry, Inntopia, internal databases, etc.). The endpoint
 * URL is per-resort; the tool *name* (`get_lift_status`) stays standardized
 * across resorts so prompts and configs are portable.
 *
 * This integration library is GSB-owned IP, hosted on GSB infrastructure,
 * outside both Odin and BotScrew. See ODIN_SUBSTRATE.md §10 + ALIGNMENT §F.3.
 */
export interface CustomToolRef {
  id: string;                          // stable identifier
  name: string;                        // verb_led_snake_case — what the LLM sees
                                       //   e.g. 'get_lift_status', 'book_lesson'
  description: string;                 // 1-2 sentences — what the tool does
                                       //   (used by the LLM to decide when to call it)
  endpoint: string;                    // GSB-hosted URL, per-resort
                                       //   e.g. 'https://api.getskibots.com/resorts/jhmr/lift-status'
  method?: 'GET' | 'POST';             // default GET
  inputSchema?: ToolSchema;            // JSON schema for input args (optional)
  outputSchema?: ToolSchema;           // JSON schema for response (optional, helps LLM)

  // Per-channel enablement — same tool can be on for chat, off for voice
  enabledOnChannels?: ChannelFamily[]; // ['chat','voice','email'] or subset
                                       //   empty / undefined = all channels

  // Production controls
  requiresApproval?: boolean;          // user must confirm before tool fires
                                       //   essential for bookings, payments, sends
  authRef?: string;                    // pointer to stored credentials (NEVER the secret)
                                       //   e.g. 'jhmr-lift-api-key' resolves server-side

  // Lifecycle / ops
  lastCalledAt?: string;               // for diagnostics in the dashboard
  version?: string;                    // for safe rollout of integration changes
  status?: 'ACTIVE' | 'DEPRECATED' | 'BROKEN';
}

/**
 * @gsb — A multi-step deterministic workflow. Use when an action needs
 * several steps in a specific order (search → reserve → confirm), often with
 * a user-facing approval gate between steps.
 *
 * Executed by Odin's Workflow Manager toolkit. Each workflow references
 * Custom Tools by name. See ALIGNMENT §F.4.
 */
export interface WorkflowRef {
  id: string;
  name: string;                        // e.g. 'book_lesson_flow'
  description: string;
  steps: WorkflowStep[];
  enabledOnChannels?: ChannelFamily[];
  requiresApproval?: boolean;          // global gate; individual steps can also gate
}

export interface WorkflowStep {
  toolName: string;                    // references a CustomToolRef.name
  approval?: boolean;                  // gate after this step
  description?: string;                // human-readable summary for the dashboard
}

/** Minimal JSON schema shape. Use full JSON Schema spec when handing to Odin. */
export interface ToolSchema {
  type: 'object';
  properties?: Record<string, { type: string; description?: string }>;
  required?: string[];
}
```

### 5a. Chat channel config  `@gsb` + Odin public-chatbot appearance

Appearance fields mirror Odin's native public-chatbot config 1:1 (ODIN_SUBSTRATE.md §7),
so this maps directly to your Appearance Dashboard.

```typescript
export interface ChatChannelConfig {
  appearance: {
    chatbotName: string;
    welcomeMessage: string;
    inputPlaceholder?: string;
    suggestions?: string[];      // one per line in Odin
    fontSizePx?: number;
    bubbleHeaderColor?: string;  // hex
    toggleIconColor?: string;
    textColor?: string;
    caretBackgroundColor?: string;
    welcomeDelaySeconds?: number;// -1 disables
    enableMultipleChats?: boolean;
    displaySources?: boolean;
    preChatImageUrl?: string;
    preChatImageBehavior?: 'ALWAYS' | 'NEVER' | 'EVERY_24H';
    toggleButtonImageUrl?: string;
    widgetHeaderImageUrl?: string;
  };
  embedTargets?: ('WEBSITE' | 'SLACK' | 'GOOGLE_CHAT')[];
}
```

### 5b. Voice channel config  `@gsb` + Odin Voice SDK

```typescript
export interface VoiceChannelConfig {
  // @gsb behavioral overlay (lives in the agent prompt, summarized here for the UI)
  greeting?: string;             // first spoken message
  voiceId?: string;              // TTS voice (e.g. "ash")
  transcriptionModel?: string;   // e.g. "whisper-1"
  // @botscrew — telephony binding (their Twilio bridge)
  twilio?: {
    phoneNumbers: { number: string; label?: string }[];
    phoneDirectoryEnabled?: boolean; // maps to contact_directory escalation
  };
  saveToChat?: boolean;          // @odin — persist session as a chat (export source)
}
```

### 5c. Email channel config  `@gsb` OAuth + `@odin` toolkit

Email is a toolkit-backed capability with a provider choice and an OAuth connection,
NOT a real-time pipe. Default to draft-for-review. (ODIN_SUBSTRATE.md §6.)

```typescript
export interface EmailChannelConfig {
  provider: EmailProvider;       // GMAIL | MICROSOFT_365
  mailbox: string;               // e.g. "support@cranmore.com"
  sendPolicy: EmailSendPolicy;   // default 'DRAFT'
  autoSendAllowlist?: string[];  // intents allowed to auto-send (when AUTO_WITH_ALLOWLIST)

  // @gsb — the OAuth connection (OUR multi-tenant Azure/Google app)
  oauth: {
    connected: boolean;
    // We hold the app registration; resort grants consent. Tokens stored OUR side.
    tenantConsentGranted?: boolean;   // M365 admin consent
    connectionRef?: string;           // pointer to stored token (NEVER the token itself)
  };

  signatureBlock?: string;
  defaultLabels?: string[];
}
```

> SECURITY: never put OAuth tokens, client secrets, or OpenAI keys in these objects.
> Store only opaque references (`connectionRef`). Secrets live in env / a secrets manager.

---

## 6. Conversation & Message  (= Odin session, surfaced via BotScrew export) `@botscrew`/`@odin`

For the Support/inbox view. Mirrors the export schema in BOTSCREW_DATA.md. Channel-
specific fields are optional and populated by `platform`.

```typescript
export interface Conversation {
  conversationId: string;
  chatId: string;
  botId: number;                 // @botscrew integer bot id
  resortId?: string;             // @gsb — resolved from botId
  platform: Platform;
  family: ChannelFamily;         // derived
  outcome?: ConversationOutcome;
  requestStatus: RequestStatus;
  startedAt: string;
  endedAt: string;
  // identity (sparse; varies by platform — see BOTSCREW_DATA.md §6)
  userId?: string;
  phone?: string;                // voice anchor
  email?: string;                // email anchor
  language?: string;
  country?: string;
  // behavioral (web-heavy)
  deviceCategory?: string;
  browser?: string;
  pageUrl?: string;
  isInWorkingHours?: boolean;
  messages: Message[];
}

export interface Message {
  messageId?: string;
  senderType: SenderType;
  text?: string;
  timestamp: string;
  isMessage?: boolean;
  isEcho?: boolean;
  visible?: boolean;
  isFromSupport?: boolean;
  // chat-only
  knowledgeSourcesUsed?: string;
  knowledgeTopSource?: string;
  // voice-only
  knowledgeSearchQuery?: string;
  isRedirectPhoneNumberProvided?: boolean;
}
```

---

## 7. The assembler  (replaces the old text-concatenation idea)

Previously "render(parent) + overlay". Now it's substrate-accurate: a channel's runtime
behavior is an **Odin agent** (prompt + model + toolkits + tools + workflows) bound to
the shared **project KB** and the shared **action library**. Omni's job is to produce
that agent config, not concatenate strings.

```typescript
/** Produce the Odin agent definition for a channel, from the shared resort + channel. */
export function buildAgentDefinition(resort: Resort, channel: Channel): OdinAgentDefinition {
  // Resolve which tools/workflows this channel actually has access to:
  // intersection of (channel opted-in IDs) and (tool's own enabledOnChannels list).
  const channelTools = resort.actionLibrary.customTools.filter(t =>
    (channel.agent.enabledCustomToolIds || []).includes(t.id) &&
    (!t.enabledOnChannels || t.enabledOnChannels.includes(channel.family))
  );
  const channelWorkflows = resort.actionLibrary.workflows.filter(w =>
    (channel.agent.enabledWorkflowIds || []).includes(w.id) &&
    (!w.enabledOnChannels || w.enabledOnChannels.includes(channel.family))
  );

  return {
    projectId: resort.odinProjectId,            // shared KB lives here
    agentId: channel.agent.odinAgentId,
    name: channel.agent.name,
    personalityPrompt: channel.agent.personalityPrompt, // @gsb authored
    model: channel.agent.model,
    toolkits: channel.agent.toolkits,           // KB toolkit + channel-specific (e.g. GMAIL)
    customTools: channelTools,                  // resort APIs this channel can call
    workflows: channelWorkflows,                // multi-step flows this channel can run
    // channel-specific extras (voice settings, email provider) attach per family
  };
}

export interface OdinAgentDefinition {
  projectId: string;
  agentId?: string;
  name: string;
  personalityPrompt: string;
  model: string;
  toolkits: ToolkitId[];
  customTools: CustomToolRef[];
  workflows: WorkflowRef[];
}
```

The unification guarantees: every channel's `OdinAgentDefinition.projectId` is the SAME
`resort.odinProjectId`, so all channels read the same KB. And every channel resolves its
tools/workflows from the SAME `resort.actionLibrary`, so updating a tool endpoint or
adding a new workflow propagates to every channel that opts in. Edit knowledge once →
all channels updated. Edit a resort tool once → all channels updated. No syncing
between channels; the shared resort IS the single source.

---

## 8. What Omni owns vs. references (the layer map, restated)

| Concept | Layer | Omni can… |
| --- | --- | --- |
| Resort identity, brand | @gsb | create/edit freely |
| Personality prompts | @gsb | author freely (the channel overlay) |
| Model selection | @gsb | choose (runs on our OpenAI keys) |
| Email OAuth connection | @gsb | own end-to-end (our Azure/Google app) |
| **Action Library (resort APIs + workflows)** | **@gsb** | **define + host + maintain per-resort HTTP endpoints; deepest moat** |
| Native Odin toolkits | @odin | select per channel (KNOWLEDGE_BASE, WEB_SEARCH, etc.) |
| Knowledge Base + sources | @odin | mirror shape; CRUD via Odin/BotScrew API |
| Agent (odinAgentId) | @odin | reference; created in Odin |
| Tool registration in Odin | @odin via @botscrew | tools registered in Odin per-agent; BotScrew API wires it |
| Conversations / sessions | @odin → @botscrew export | read-only (display) |
| Bot registry (botscrewBotId) | @botscrew | reference only |
| Billing, routing, telephony bridge | @botscrew | reference only |
| Analytics aggregates | @botscrew | read (their endpoints) or recompute from export |

---

## 9. Open questions this model deliberately leaves as references

1. **Same project or separate?** Do a resort's chat + voice channels share one
   `odinProjectId` (→ KB already shared) or have separate projects (→ duplicated KB)?
   This model assumes shared; confirm per resort.
2. **EMAIL platform value** — pending BotScrew adding it to the `platform` enum
   (the Daria question). Until then, email channels are DRAFT status.
3. **Write path** — whether Omni configures agents via BotScrew's API, Odin's API, or
   hands specs to BotScrew. The model is agnostic; the binding layer decides.
4. **Custom Tool registration mechanism** — does BotScrew's wrapper register Odin
   Custom Tools that call **arbitrary GSB-hosted HTTP endpoints** with auth, or are
   all action behaviors currently hardcoded into agent prompts? See ALIGNMENT §F.8.
5. **Flow vs. Custom Tool relationship** — BotScrew also has its own Flow / Atom /
   AI Action abstraction layered over Odin. How that maps to (or replaces) Odin
   Custom Tools needs clarification with Daria before final Knowledge page spec.

---

## 10. Build note for Claude Code

Implement these as TypeScript types/interfaces in Omni (e.g. `src/data/model.ts`),
replacing the ad-hoc `parent.ts` shapes. Seed with one realistic resort (placeholder
data, no real keys/tokens/IDs). Keep `@gsb`/`@odin`/`@botscrew` ownership comments inline
so the boundary stays visible as the app grows. Reference `ODIN_SUBSTRATE.md` and
`BOTSCREW_DATA.md` for field semantics. Do not embed any secrets; use opaque refs only.
