/**
 * Omni-Odin canonical data model.
 *
 * Substrate-aligned types mapping the Omni dashboard onto the Odin engine:
 *
 *   Resort         = Odin Project
 *   KnowledgeBase  = Odin project KB (ONE per Resort, shared across channels)
 *   ActionLibrary  = GSB-owned per-resort HTTP endpoints + workflows
 *   Channel        = Odin Agent (prompt + model + toolkits) bound to a BotScrew bot
 *
 * Ownership tags appear inline throughout — they're load-bearing, not decoration:
 *   @gsb       — GetSkiBots owns it (prompts, ski config, OAuth, OpenAI keys)
 *   @odin      — Odin owns it (KB, agents, sessions); we mirror its shape
 *   @botscrew  — BotScrew's wrapper owns it (bot registry, billing, routing, analytics)
 *
 * Reference docs (in docs/reference/):
 *   - ODIN_SUBSTRATE.md     — engine model, SDK shapes, toolkits, email
 *   - BOTSCREW_DATA.md      — egress / conversation-export shapes
 *   - OMNI_DATA_MODEL.md    — the spec this file implements
 *   - OMNI_ODIN_ALIGNMENT.md — substrate map, audit table, action layer framing
 *
 * SECURITY: never put OAuth tokens, client secrets, OpenAI keys, or any other
 * real credentials in objects shaped by these types. Store opaque references
 * (connectionRef, authRef) only; secrets live in env / a secrets manager.
 */

// ============================================================================
// 1. Enums + primitives
// ============================================================================

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

/**
 * @botscrew — Conversation outcomes from the BotScrew CSV export.
 * NOTE: dictionary says 'RESOLVED' but live data uses 'SOLVED'.
 * Treat SOLVED as canonical; alias RESOLVED → SOLVED on ingest.
 * See BOTSCREW_DATA.md §4.
 */
export type ConversationOutcome =
  | 'UNENGAGED'
  | 'SOLVED'
  | 'ESCALATED'
  | 'ABANDONED'
  | 'UNRESOLVED'
  | 'FAILED';

/** @botscrew — Support / live-agent handoff state machine. */
export type RequestStatus =
  | 'none'
  | 'open'
  | 'assigned'
  | 'pending'
  | 'closed'
  | 'expired';

/** @botscrew — Who sent a message row. */
export type SenderType = 'USER' | 'BOT' | 'SUPPORT';

/** @botscrew — Row-level delivery status (channel-dependent). */
export type RowStatus = 'CONVERTED' | 'SENT' | 'DELIVERED' | 'READ';

/** @gsb — Email provider. Connection lives in our infrastructure. */
export type EmailProvider = 'GMAIL' | 'MICROSOFT_365';

/** @gsb — How outbound email is gated. Default to draft-for-review. */
export type EmailSendPolicy = 'DRAFT' | 'AUTO' | 'AUTO_WITH_ALLOWLIST';

// ============================================================================
// 2. Resort  (= Odin Project)  @gsb wrapping @odin
// ============================================================================

/**
 * The parent. GetSkiBots identity and ski metadata wrapping a reference to the
 * underlying Odin project and the BotScrew account it lives under.
 */
export interface Resort {
  // --- @gsb: our identity for the resort -----------------------------------
  resortId: string;                  // our stable slug, e.g. "mountain-collective"
  displayName: string;               // "Mountain Collective"
  brand: ResortBrand;                // colors, logo, fonts (the ski layer)
  region?: string;
  passAffiliations?: string[];       // e.g. ["mountain-collective", "ikon"]

  // --- @odin: the substrate binding ----------------------------------------
  /**
   * THE unification key: channels sharing this projectId share the KB.
   * Placeholder UUIDs are acceptable during prototyping; the *field* must exist.
   */
  odinProjectId: string;

  // --- @botscrew: account/registry binding ---------------------------------
  botscrewAccountRef?: string;       // which BotScrew account/tenant owns it

  // --- composed children ---------------------------------------------------
  knowledgeBase: KnowledgeBase;      // ONE shared KB (Odin project-level)
  actionLibrary: ActionLibrary;      // ONE shared action library (GSB-owned)
  channels: Channel[];               // chat / voice / email agents

  updatedAt: string;
}

/**
 * @gsb — The shared per-resort action library. Custom Tools (HTTP endpoints
 * GSB has built for THIS resort) and Workflows (multi-step flows). Defined once
 * at the resort level; channels reference by name + enable per-channel.
 * See OMNI_ODIN_ALIGNMENT.md §F for the substrate framing.
 */
export interface ActionLibrary {
  customTools: CustomToolRef[];
  workflows: WorkflowRef[];
}

/** @gsb — The ski brand system (colors, fonts, logo). Purely ours. */
export interface ResortBrand {
  primaryColor: string;              // hex, e.g. "#a8201a"
  secondaryColor?: string;
  logoUrl?: string;
  headerImageUrl?: string;
  fonts?: { serif?: string; sans?: string; mono?: string };
}

// ============================================================================
// 3. KnowledgeBase  (= Odin project KB)  @odin — the unification layer
// ============================================================================

/**
 * ONE per resort. Shared across all channels. Mirrors Odin's KB ingestion model
 * (see ODIN_SUBSTRATE.md §9). Omni edits this once; all channels inherit.
 */
export interface KnowledgeBase {
  /** @odin — belongs to the Odin project. Same as Resort.odinProjectId. */
  odinProjectId: string;

  sources: KnowledgeSource[];        // crawl / files / documents / connectors
  templates: KnowledgeTemplate[];    // FAQ / response / example pairs
  smartTables: SmartTableRef[];      // structured resort data (lift status, pricing)

  /** KB processing config — Odin project-level settings. */
  chunking?: {
    strategy: 'sentence' | 'semantic';
    chunkSize?: number;              // default 64, rec. 64-512 tokens
    chunkOverlap?: number;           // default 16
    enrichment?: boolean;            // LLM-enhanced chunking
  };
  lastSyncedAt?: string;
}

export type KnowledgeSourceType =
  | 'WEB_CRAWL'    // Odin web crawler   → Omni "Website" tab
  | 'FILE'         // upload             → Omni "Files" tab
  | 'DOCUMENT'     // in-KB text         → Omni "Text Edits" tab
  | 'CONNECTOR';   // Drive/SharePoint/SQL/etc.

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  label: string;
  // type-specific:
  url?: string;                      // WEB_CRAWL / CONNECTOR
  fileName?: string;                 // FILE
  /** Free-form body for DOCUMENT entries (in-KB text). */
  body?: string;
  syncSchedule?: string;             // cron-ish, for crawl/connector refresh
  status?: 'OK' | 'SYNCING' | 'FAILED';
}

/** @odin — KB Templates maps to resort FAQ patterns (e.g. JHMR Q&A set). */
export interface KnowledgeTemplate {
  id: string;
  kind: 'FAQ' | 'RESPONSE' | 'EXAMPLE';
  question?: string;                 // FAQ
  content: string;
  associatedSourceId?: string;       // optional KB file for extra context
}

export interface SmartTableRef {
  odinTableId: string;
  name: string;                      // e.g. "Lift Status", "Pricing"
  description?: string;
}

// ============================================================================
// 4. Channel  (= Odin Agent + binding)  @gsb overlay over @odin agent
// ============================================================================

/**
 * A channel is one Odin agent (its prompt + model + toolkits) drawing on the
 * shared KB, plus the BotScrew bot record it deploys to. This replaces the old
 * "text overlay" idea: the overlay IS the agent config.
 */
export interface Channel {
  // --- @gsb: our channel identity ------------------------------------------
  channelId: string;                 // our id, e.g. "mtn-collective-voice"
  family: ChannelFamily;             // chat | voice | email
  /**
   * Which BotScrew platform value(s) this channel serves.
   *   chat  → ['WEBSITE','FB_MESSENGER', ...]
   *   voice → ['VOICE_TWILIO']
   *   email → ['EMAIL']
   */
  platforms: Platform[];

  // --- @odin: the agent (this is the channel overlay) ----------------------
  agent: AgentConfig;                // prompt + model + toolkits, on the shared KB

  // --- @botscrew: production binding ---------------------------------------
  /** Their integer bot id (101, 248, …); null if unwired. */
  botscrewBotId?: number | null;

  // --- channel-specific blocks (only one applies based on `family`) --------
  chat?: ChatChannelConfig;
  voice?: VoiceChannelConfig;
  email?: EmailChannelConfig;

  status: 'ACTIVE' | 'DRAFT' | 'DISABLED';
}

/** @odin — the agent config; the substance of the channel overlay. */
export interface AgentConfig {
  /** @odin — the agent id (null until created in Odin). */
  odinAgentId?: string | null;
  name: string;
  /** @gsb — WE author this (the system prompt / personality prompt). */
  personalityPrompt: string;
  /** @gsb selects; runs on our OpenAI key. e.g. "gpt-5.2" */
  model: string;
  responseFormat?: 'TEXT' | 'JSON';
  /** Which Odin toolkits this channel has access to. */
  toolkits: ToolkitId[];
  memoryEnabled?: boolean;

  /**
   * Channels don't OWN tools/workflows (those live at the resort level in
   * resort.actionLibrary). Each channel just picks which ones it's allowed
   * to use. To resolve: filter resort.actionLibrary.customTools and
   * resort.actionLibrary.workflows by membership in these arrays AND by
   * their own `enabledOnChannels` flag.
   */
  enabledCustomToolIds?: string[];   // CustomToolRef.id values
  enabledWorkflowIds?: string[];     // WorkflowRef.id values
}

// ============================================================================
// 5. Action layer  —  tools, integrations, custom resort APIs, workflows
//
// Substrate ref: ODIN_SUBSTRATE.md §5; alignment OMNI_ODIN_ALIGNMENT.md §F
//
// An agent has access to four kinds of "tools" beyond its KB:
//   1. Native Odin toolkits (engine-provided)        → ToolkitId enum
//   2. OAuth integration toolkits (Gmail / M365)     → ToolkitId enum (subset)
//   3. Custom Tools (per-resort GSB-built endpoints) → CustomToolRef[]
//   4. Workflows (multi-step deterministic flows)    → WorkflowRef[]
//
// Toolkits are enabled per agent (per channel). Custom Tools and Workflows
// are defined at the Resort level (shared across channels) and referenced
// from each channel's AgentConfig with a per-channel enabled flag.
// ============================================================================

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
 * that GSB builds from that resort's underlying data systems (WordPress, scraped
 * feeds, Snocountry, Inntopia, internal databases, etc.). The endpoint URL is
 * per-resort; the tool *name* (`get_lift_status`) stays standardized across
 * resorts so prompts and configs are portable.
 *
 * This integration library is GSB-owned IP, hosted on GSB infrastructure,
 * outside both Odin and BotScrew.
 * See ODIN_SUBSTRATE.md §10 + OMNI_ODIN_ALIGNMENT.md §F.3.
 */
export interface CustomToolRef {
  id: string;                          // stable identifier
  /**
   * Verb-led snake_case — what the LLM sees.
   * e.g. 'get_lift_status', 'book_lesson'
   */
  name: string;
  /**
   * 1-2 sentences — what the tool does.
   * Used by the LLM to decide when to call it.
   */
  description: string;
  /**
   * GSB-hosted URL, per-resort.
   * e.g. 'https://api.getskibots.com/resorts/jhmr/lift-status'
   */
  endpoint: string;
  method?: 'GET' | 'POST';             // default GET
  inputSchema?: ToolSchema;            // JSON schema for input args (optional)
  outputSchema?: ToolSchema;           // JSON schema for response (optional, helps LLM)

  /**
   * Per-channel enablement — same tool can be on for chat, off for voice.
   * Empty / undefined = available to all channels.
   */
  enabledOnChannels?: ChannelFamily[];

  // Production controls
  /**
   * User must confirm before tool fires.
   * Essential for bookings, payments, sends.
   */
  requiresApproval?: boolean;
  /**
   * Pointer to stored credentials (NEVER the secret itself).
   * e.g. 'jhmr-lift-api-key' resolves server-side via a secrets manager.
   */
  authRef?: string;

  // Lifecycle / ops
  lastCalledAt?: string;               // for diagnostics in the dashboard
  version?: string;                    // for safe rollout of integration changes
  status?: 'ACTIVE' | 'DEPRECATED' | 'BROKEN';
}

/**
 * @gsb — A multi-step deterministic workflow. Use when an action needs several
 * steps in a specific order (search → reserve → confirm), often with a
 * user-facing approval gate between steps.
 *
 * Executed by Odin's Workflow Manager toolkit. Each workflow references Custom
 * Tools by name. See OMNI_ODIN_ALIGNMENT.md §F.4.
 */
export interface WorkflowRef {
  id: string;
  name: string;                        // e.g. 'book_lesson_flow'
  description: string;
  steps: WorkflowStep[];
  enabledOnChannels?: ChannelFamily[];
  /** Global approval gate; individual steps can also gate. */
  requiresApproval?: boolean;
}

export interface WorkflowStep {
  /** References a CustomToolRef.name. */
  toolName: string;
  approval?: boolean;                  // gate after this step
  description?: string;                // human-readable summary for the dashboard
}

/** Minimal JSON schema shape. Use full JSON Schema spec when handing to Odin. */
export interface ToolSchema {
  type: 'object';
  properties?: Record<string, { type: string; description?: string }>;
  required?: string[];
}

// ============================================================================
// 6. Per-channel config blocks
// ============================================================================

/**
 * @gsb + Odin public-chatbot appearance.
 * Appearance fields mirror Odin's native public-chatbot config 1:1.
 * See ODIN_SUBSTRATE.md §7.
 */
export interface ChatChannelConfig {
  appearance: {
    chatbotName: string;
    welcomeMessage: string;
    inputPlaceholder?: string;
    suggestions?: string[];          // one per line in Odin
    fontSizePx?: number;
    bubbleHeaderColor?: string;      // hex
    toggleIconColor?: string;
    textColor?: string;
    caretBackgroundColor?: string;
    welcomeDelaySeconds?: number;    // -1 disables
    enableMultipleChats?: boolean;
    displaySources?: boolean;
    preChatImageUrl?: string;
    preChatImageBehavior?: 'ALWAYS' | 'NEVER' | 'EVERY_24H';
    toggleButtonImageUrl?: string;
    widgetHeaderImageUrl?: string;
  };
  embedTargets?: ('WEBSITE' | 'SLACK' | 'GOOGLE_CHAT')[];
}

/** @gsb + Odin Voice SDK + @botscrew Twilio bridge. */
export interface VoiceChannelConfig {
  /** @gsb — first spoken message; also referenced in the agent prompt. */
  greeting?: string;
  /** @gsb — TTS voice (e.g. "ash" for OpenAI Realtime, or an ElevenLabs voice_id). */
  voiceId?: string;
  /** @gsb — e.g. "whisper-1" */
  transcriptionModel?: string;
  /** @gsb — model id used by the realtime voice provider (e.g. 'voice-realtime-2.0'). */
  realtimeModel?: string;
  /**
   * @odin — ElevenLabs Conversational AI agent ID for this resort's voice channel.
   * Each resort has its own agent. Substrate-aware naming, even though the
   * actual provider today is ElevenLabs (mediated via @odin Voice toolkit).
   */
  voiceAgentId?: string | null;
  /** @botscrew — telephony binding (their Twilio bridge). */
  twilio?: {
    phoneNumbers: { number: string; label?: string }[];
    phoneDirectoryEnabled?: boolean;
  };
  /** @odin — persist session as a chat (becomes export source). */
  saveToChat?: boolean;
}

/**
 * @gsb OAuth + @odin toolkit.
 * Email is a toolkit-backed capability with a provider choice and an OAuth
 * connection — NOT a real-time pipe. Default to draft-for-review.
 * See ODIN_SUBSTRATE.md §6.
 */
export interface EmailChannelConfig {
  provider: EmailProvider;             // GMAIL | MICROSOFT_365
  mailbox: string;                     // e.g. "support@example.com"
  sendPolicy: EmailSendPolicy;         // default 'DRAFT'
  /** Intents allowed to auto-send (when AUTO_WITH_ALLOWLIST). */
  autoSendAllowlist?: string[];

  /**
   * @gsb — the OAuth connection (OUR multi-tenant Azure/Google app).
   * Resort grants consent; tokens stored OUR side.
   * SECURITY: never store actual tokens here. `connectionRef` is opaque.
   */
  oauth: {
    connected: boolean;
    tenantConsentGranted?: boolean;    // M365 admin consent
    connectionRef?: string;            // pointer to stored token (NEVER the token)
  };

  signatureBlock?: string;
  defaultLabels?: string[];
}

// ============================================================================
// 7. Conversation + Message  (= Odin session, surfaced via BotScrew export)
//    @botscrew / @odin
// ============================================================================

/**
 * For the Support/inbox view. Mirrors the export schema in BOTSCREW_DATA.md.
 * Channel-specific fields are optional and populated based on `platform`.
 */
export interface Conversation {
  conversationId: string;
  chatId: string;
  /** @botscrew integer bot id. */
  botId: number;
  /** @gsb — resolved from botId via Resort registry. */
  resortId?: string;
  platform: Platform;
  /** Derived from `platform`. */
  family: ChannelFamily;
  outcome?: ConversationOutcome;
  requestStatus: RequestStatus;
  startedAt: string;
  endedAt: string;

  // Identity (sparse; varies by platform — see BOTSCREW_DATA.md §6)
  userId?: string;
  phone?: string;                      // voice anchor
  email?: string;                      // email anchor
  language?: string;
  country?: string;

  // Behavioral (web-heavy; sparse for voice/messenger)
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
  status?: RowStatus;
  // chat-only
  knowledgeSourcesUsed?: string;
  knowledgeTopSource?: string;
  // voice-only
  knowledgeSearchQuery?: string;
  isRedirectPhoneNumberProvided?: boolean;
}

// ============================================================================
// 8. The assembler  —  produce an Odin agent definition from Resort + Channel
//
// Previously "render(parent) + overlay". Now it's substrate-accurate: a
// channel's runtime behavior is an Odin agent (prompt + model + toolkits +
// tools + workflows) bound to the shared project KB and the shared action
// library. Omni's job is to produce that agent config, not concatenate strings.
// ============================================================================

export interface OdinAgentDefinition {
  projectId: string;
  agentId?: string | null;
  name: string;
  personalityPrompt: string;
  model: string;
  toolkits: ToolkitId[];
  customTools: CustomToolRef[];
  workflows: WorkflowRef[];
}

/**
 * Produce the Odin agent definition for a channel, from the shared Resort.
 *
 * Resolution rules:
 *   - Tools/Workflows accessible to a channel = INTERSECTION of
 *     (channel.agent.enabled[Tool|Workflow]Ids) and
 *     (tool/workflow.enabledOnChannels includes channel.family).
 *   - The agent's projectId is always the Resort's odinProjectId — that's the
 *     unification guarantee. All channels read the same KB.
 */
export function buildAgentDefinition(
  resort: Resort,
  channel: Channel,
): OdinAgentDefinition {
  const customTools = resort.actionLibrary.customTools.filter(
    (t) =>
      (channel.agent.enabledCustomToolIds ?? []).includes(t.id) &&
      (!t.enabledOnChannels || t.enabledOnChannels.includes(channel.family)),
  );
  const workflows = resort.actionLibrary.workflows.filter(
    (w) =>
      (channel.agent.enabledWorkflowIds ?? []).includes(w.id) &&
      (!w.enabledOnChannels || w.enabledOnChannels.includes(channel.family)),
  );

  return {
    projectId: resort.odinProjectId,
    agentId: channel.agent.odinAgentId,
    name: channel.agent.name,
    personalityPrompt: channel.agent.personalityPrompt,
    model: channel.agent.model,
    toolkits: channel.agent.toolkits,
    customTools,
    workflows,
  };
}
