/**
 * Mountain Collective — seed data in the substrate-aligned shape.
 *
 * This replaces the old `jacksonHole` seed from omni's `parent.ts`. The new
 * shape (see `model.ts`) makes the substrate explicit:
 *   - One Resort = one Odin Project (the unification key).
 *   - One shared KnowledgeBase across all channels.
 *   - One shared ActionLibrary of GSB-built per-resort HTTP endpoints + workflows.
 *   - Three Channels (chat / voice / email), each binding to an Odin Agent.
 *
 * Mountain Collective is intentionally used as the seed (per CLAUDE_CODE_BRIEF_OMNI_ODIN.md):
 * a visible, real-world test case that's not Jackson Hole, so the model's shape
 * isn't accidentally tied to one resort's quirks.
 *
 * Placeholder IDs (odinProjectId, odinAgentId, voiceAgentId) and OAuth state are
 * deliberately stub values — no real tokens or credentials live here.
 *
 * Open questions about what JH-specific content (the 17 knowledge groups, the
 * 5000-char system prompt) carries over from omni → omni-odin live in
 * `docs/alignment/_questions.md`.
 */

import type {
  Resort,
  KnowledgeBase,
  ActionLibrary,
  CustomToolRef,
  WorkflowRef,
  Channel,
} from './model';

// ============================================================================
// Catalog: GSB's standardized tool name catalog.
//
// Per OMNI_ODIN_ALIGNMENT.md §F.3 — the tool *name* (`get_lift_status`) stays
// standardized across resorts even though each resort's underlying endpoint is
// custom-built. Naming convention: verb-led snake_case.
//
// These are placeholder endpoints; production endpoints are GSB-hosted per resort.
// ============================================================================

/**
 * Mountain Collective's per-resort tool library. Each entry is the per-resort
 * HTTP endpoint GSB builds against MC's data sources. In production the
 * endpoint URLs would point at GSB infrastructure.
 */
const MTN_COLLECTIVE_TOOLS: CustomToolRef[] = [
  {
    id: 'tool-snow-report',
    name: 'get_snow_report',
    description: 'Returns snowfall in the last 24h / 48h / 7d and current base depth for the resort.',
    endpoint: 'https://api.getskibots.com/resorts/mtn-collective/snow-report',
    method: 'GET',
    enabledOnChannels: ['chat', 'voice', 'email'],
    status: 'ACTIVE',
  },
  {
    id: 'tool-lift-status',
    name: 'get_lift_status',
    description: 'Returns the current open/closed status of each lift at the resort.',
    endpoint: 'https://api.getskibots.com/resorts/mtn-collective/lift-status',
    method: 'GET',
    enabledOnChannels: ['chat', 'voice', 'email'],
    status: 'ACTIVE',
  },
  {
    id: 'tool-weather',
    name: 'get_weather',
    description: 'Returns current temperature, wind, and conditions at the base and summit.',
    endpoint: 'https://api.getskibots.com/resorts/mtn-collective/weather',
    method: 'GET',
    enabledOnChannels: ['chat', 'voice', 'email'],
    status: 'ACTIVE',
  },
  {
    id: 'tool-parking',
    name: 'get_parking_status',
    description: 'Returns parking lot availability and recommended lot for the current day.',
    endpoint: 'https://api.getskibots.com/resorts/mtn-collective/parking',
    method: 'GET',
    // Voice typically skips this — long answers don't read well aloud.
    enabledOnChannels: ['chat', 'email'],
    status: 'ACTIVE',
  },
  {
    id: 'tool-events',
    name: 'get_events',
    description: 'Returns upcoming on-mountain events with date, time, location, and link.',
    endpoint: 'https://api.getskibots.com/resorts/mtn-collective/events',
    method: 'GET',
    enabledOnChannels: ['chat', 'voice', 'email'],
    status: 'ACTIVE',
  },
  {
    id: 'tool-terrain-status',
    name: 'get_terrain_status',
    description: 'Returns open/closed status of trails and terrain features (parks, glades, etc.).',
    endpoint: 'https://api.getskibots.com/resorts/mtn-collective/terrain-status',
    method: 'GET',
    enabledOnChannels: ['chat', 'voice', 'email'],
    // Disabled in the JH seed; carried over here as ACTIVE to show shape.
    status: 'ACTIVE',
  },
];

/**
 * Multi-step workflows that chain tool calls with optional approval gates.
 * See OMNI_ODIN_ALIGNMENT.md §F.4. Seeded as an example shape; not wired.
 */
const MTN_COLLECTIVE_WORKFLOWS: WorkflowRef[] = [
  {
    id: 'wf-lookup-conditions',
    name: 'lookup_conditions',
    description: 'Conditions briefing: pull snow report + weather + lift status and summarize.',
    steps: [
      { toolName: 'get_snow_report', description: 'Recent snowfall + base depth.' },
      { toolName: 'get_weather', description: 'Current temp/wind/conditions.' },
      { toolName: 'get_lift_status', description: 'Which lifts are spinning.' },
    ],
    enabledOnChannels: ['chat', 'voice', 'email'],
    requiresApproval: false,
  },
];

const MTN_COLLECTIVE_ACTION_LIBRARY: ActionLibrary = {
  customTools: MTN_COLLECTIVE_TOOLS,
  workflows: MTN_COLLECTIVE_WORKFLOWS,
};

// ============================================================================
// Knowledge Base — shared across all channels
// ============================================================================

const MTN_COLLECTIVE_KB: KnowledgeBase = {
  odinProjectId: 'odin-proj-mtn-collective-placeholder',
  sources: [
    {
      id: 'kb-src-web',
      type: 'WEB_CRAWL',
      label: 'mountaincollective.com',
      url: 'https://www.mountaincollective.com/',
      syncSchedule: '0 6 * * *', // daily at 6 AM
      status: 'OK',
    },
    {
      id: 'kb-src-faq-doc',
      type: 'DOCUMENT',
      label: 'Mountain Collective FAQ (in-KB document)',
      body: [
        'What is the Mountain Collective pass?',
        '  A multi-resort ski pass providing 2 days at each of 25+ partner resorts.',
        '',
        'How do reservations work at partner resorts?',
        '  Reservations are required at some resorts. Check the resort page for current requirements.',
        '',
        'Are there blackout dates?',
        '  No blackout dates apply to Mountain Collective passholders at any partner resort.',
      ].join('\n'),
      status: 'OK',
    },
    {
      id: 'kb-src-pass-terms',
      type: 'FILE',
      label: 'pass-terms-2025-26.pdf',
      fileName: 'pass-terms-2025-26.pdf',
      status: 'OK',
    },
  ],
  templates: [
    {
      id: 'kb-tpl-blackouts',
      kind: 'FAQ',
      question: 'Are there blackout dates on the Mountain Collective Pass?',
      content: 'No blackout dates. Mountain Collective is valid every operating day at every partner resort for the days included on your pass.',
    },
    {
      id: 'kb-tpl-pass-pickup',
      kind: 'RESPONSE',
      content: 'Passes are picked up at the ticket window of your first partner resort. Bring a government-issued photo ID matching your registration.',
    },
    {
      id: 'kb-tpl-add-days',
      kind: 'FAQ',
      question: 'Can I add additional days after I use my 2 days at a resort?',
      content: 'Yes — additional days at any partner resort are 50% off the window rate after your 2 included days have been used.',
    },
  ],
  smartTables: [],
  chunking: {
    strategy: 'semantic',
    chunkSize: 256,
    chunkOverlap: 32,
    enrichment: false,
  },
  lastSyncedAt: new Date().toISOString(),
};

// ============================================================================
// Channels — one Agent per channel, all on the shared KB + ActionLibrary
// ============================================================================

const ALL_TOOL_IDS = MTN_COLLECTIVE_TOOLS.map((t) => t.id);

/** Chat channel — web widget + future FB/WhatsApp/SMS connectors. */
const CHAT_CHANNEL: Channel = {
  channelId: 'mtn-collective-chat',
  family: 'chat',
  platforms: ['WEBSITE', 'FB_MESSENGER'],
  agent: {
    odinAgentId: 'odin-agent-mtn-collective-chat-placeholder',
    name: 'Mountain Collective Chat',
    personalityPrompt: [
      'You are the Mountain Collective virtual assistant in the web chat / messenger context.',
      '',
      'Keep replies under 90 words. Two to three short sentences is usually right.',
      'Use markdown for links: format as [here](URL).',
      'Mirror the guest tone — concise back if they are concise.',
      'For per-connector behavior (SMS plain text, WhatsApp 24h window, etc.) defer to channel guidance.',
      '',
      'Use the Knowledge Base for static reference content (pass terms, FAQs).',
      'Use Custom Tools for live operational data (conditions, lift status, parking).',
    ].join('\n'),
    model: 'gpt-5.2',
    responseFormat: 'TEXT',
    toolkits: ['KNOWLEDGE_BASE', 'WEB_SEARCH', 'WORKFLOW_MANAGER'],
    enabledCustomToolIds: ALL_TOOL_IDS,
    enabledWorkflowIds: ['wf-lookup-conditions'],
    memoryEnabled: false,
  },
  botscrewBotId: null,
  status: 'DRAFT',
  chat: {
    appearance: {
      chatbotName: 'Mountain Collective',
      welcomeMessage: 'Welcome to Mountain Collective. How can we help today?',
      inputPlaceholder: 'Ask about partner resorts, dates, conditions…',
      suggestions: [
        'What is the Mountain Collective pass?',
        'Which resorts are included?',
        'Are there blackout dates?',
      ],
      welcomeDelaySeconds: 2,
      enableMultipleChats: true,
      displaySources: true,
    },
    embedTargets: ['WEBSITE'],
  },
};

/** Voice channel — Twilio + Odin Voice SDK (ElevenLabs realtime under the hood). */
const VOICE_CHANNEL: Channel = {
  channelId: 'mtn-collective-voice',
  family: 'voice',
  platforms: ['VOICE_TWILIO'],
  agent: {
    odinAgentId: 'odin-agent-mtn-collective-voice-placeholder',
    name: 'Mountain Collective Voice',
    personalityPrompt: [
      'You are the Mountain Collective virtual assistant answering phone calls.',
      '',
      'Speak naturally, like a helpful team member on the phone.',
      'No markdown, bullets, emojis, "click here," raw links, or "as I mentioned before."',
      'Keep each turn to two sentences max. If more detail is needed, ask, "want the rest?"',
      'Say numbers out loud ("fifty-five dollars"). Never read URLs aloud.',
      '',
      'Welcome only on the first turn. Never re-greet mid-call.',
      'Ask only one clarifying question per turn.',
      'Before any booking, purchase, cancellation, or commitment, confirm details and wait for approval.',
      '',
      'If a tool fails, do not send the guest to the website first. Offer to text or email instead.',
      'Never invent status, availability, pricing, weather, parking, event times, or confirmations.',
    ].join('\n'),
    model: 'gpt-5.2',
    responseFormat: 'TEXT',
    toolkits: ['KNOWLEDGE_BASE', 'WORKFLOW_MANAGER'],
    // Voice skips parking (long answers); rest of the tool set is enabled.
    enabledCustomToolIds: ALL_TOOL_IDS.filter((id) => id !== 'tool-parking'),
    enabledWorkflowIds: ['wf-lookup-conditions'],
    memoryEnabled: false,
  },
  botscrewBotId: null,
  status: 'DRAFT',
  voice: {
    greeting: 'Welcome to Mountain Collective. How can we help today?',
    voiceId: 'ash',                         // OpenAI realtime voice; @gsb @odin
    realtimeModel: 'voice-realtime-2.0',
    transcriptionModel: 'whisper-1',
    voiceAgentId: 'agent_4801ks9kyskcfgetyq0krbqj10cm', // @odin placeholder
    saveToChat: true,
  },
};

/** Email channel — M365 toolkit + GSB OAuth multi-tenant app. */
const EMAIL_CHANNEL: Channel = {
  channelId: 'mtn-collective-email',
  family: 'email',
  platforms: ['EMAIL'],
  agent: {
    odinAgentId: null, // not yet created
    name: 'Mountain Collective Email',
    personalityPrompt: [
      'You are the Mountain Collective virtual assistant responding to inbound email.',
      '',
      'Write like email, not chat. Body paragraphs, not bullets-for-everything.',
      'Greeting: "Hi [first name]," when known, "Hi there," when not.',
      'Body: one to three paragraphs. Lists only when listing 3+ specific items.',
      'Sign-off: "Virtual Assistant / Mountain Collective".',
      '',
      'Subject: match descriptive inbound subjects; generate one when generic.',
      'Threading: on Re: emails, don\'t re-introduce yourself or re-summarize.',
      'Default send policy: draft for human review.',
    ].join('\n'),
    model: 'gpt-5.2',
    responseFormat: 'TEXT',
    toolkits: ['KNOWLEDGE_BASE', 'WORKFLOW_MANAGER', 'MICROSOFT_365'],
    enabledCustomToolIds: ALL_TOOL_IDS,
    enabledWorkflowIds: ['wf-lookup-conditions'],
    memoryEnabled: false,
  },
  botscrewBotId: null,
  status: 'DRAFT',
  email: {
    provider: 'MICROSOFT_365',
    mailbox: 'support@example.com',         // placeholder; real mailbox per resort
    sendPolicy: 'DRAFT',
    oauth: {
      connected: false,
      tenantConsentGranted: false,
      // Opaque pointer only — never a real token in source.
      connectionRef: undefined,
    },
    signatureBlock: 'Virtual Assistant\nMountain Collective\nsupport@example.com',
    defaultLabels: ['guest-services'],
  },
};

// ============================================================================
// The Resort — what the pages consume
// ============================================================================

export const mountainCollective: Resort = {
  resortId: 'mountain-collective',
  displayName: 'Mountain Collective',
  brand: {
    primaryColor: '#1a3a5c',                // placeholder navy
    secondaryColor: '#a8c7e0',
    fonts: { sans: 'Inter', serif: 'Fraunces' },
  },
  region: 'Multi-resort pass program',
  passAffiliations: ['mountain-collective'],

  odinProjectId: 'odin-proj-mtn-collective-placeholder',
  botscrewAccountRef: undefined,

  knowledgeBase: MTN_COLLECTIVE_KB,
  actionLibrary: MTN_COLLECTIVE_ACTION_LIBRARY,
  channels: [CHAT_CHANNEL, VOICE_CHANNEL, EMAIL_CHANNEL],

  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Convenience accessors for pages that previously read jacksonHole.<field>
// ============================================================================

/** The active resort the dashboard is editing. (Single-resort prototype for now.) */
export const activeResort: Resort = mountainCollective;

/** Shorthand for the 3 channels in canonical order: chat, voice, email. */
export const channels = mountainCollective.channels;

/** Voice channel by family — used by the voice testing flow. */
export const voiceChannel: Channel | undefined =
  mountainCollective.channels.find((c) => c.family === 'voice');

/** Chat channel by family. */
export const chatChannel: Channel | undefined =
  mountainCollective.channels.find((c) => c.family === 'chat');

/** Email channel by family. */
export const emailChannel: Channel | undefined =
  mountainCollective.channels.find((c) => c.family === 'email');

/**
 * Per-resort ElevenLabs Conversational AI agent ID, surfaced for the voice
 * library to keep the paste-flow eliminated. Falls back to a placeholder if
 * the voice channel doesn't have one set.
 */
export const DEFAULT_ELEVENLABS_AGENT_ID: string =
  voiceChannel?.voice?.voiceAgentId ?? 'agent_4801ks9kyskcfgetyq0krbqj10cm';
