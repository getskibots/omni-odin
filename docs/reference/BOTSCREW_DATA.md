# BotScrew Data Reference

Source of truth for the BotScrew conversation-export data model, as understood by
GetSkiBots. Built from three inputs:

1. **Field dictionary** — BotScrew's "Export fields description" document (field semantics).
2. **Observed chat export** — `Export_Chat_Cranmore_Mountain_Resort_-_ACTIVE` (583 message rows, 102 conversations, platforms `WEBSITE` + `FB_MESSENGER`).
3. **Observed voice export** — `Export_Voice_Voice_-_Mtn_Collective_-_ACTIVE` (2,249 message rows, 337 conversations, platform `VOICE_TWILIO`).

This document records what is **observed in real data** alongside what the dictionary
**claims**, and flags every discrepancy. Where they disagree, trust the observed value
and confirm with BotScrew.

> Scope note: this documents the **egress** (data coming OUT of BotScrew). It does NOT
> document the runtime/conversation lifecycle (how a message flows through prompt →
> knowledge → flows → actions) or the configuration/API surface. Those remain open
> questions for BotScrew (see "Open Questions" at the end).

---

## 1. Grain and structure

- The export is **message-level**: one row per message or system event, not one row per conversation.
- Rows roll up to a conversation via **`conversation_id`**.
- Observed: chat export = 583 rows across 102 conversations; voice export = 2,249 rows across 337 conversations.
- The export is organized into **four labeled sections** (a header row above the field names):
  - Section 1 — Conversation Core
  - Section 2 — Message Intelligence
  - Section 3 — User Identity
  - Section 4 — Behavioral Context

### Turning rows into a conversation thread (recipe)
1. Group rows by `conversation_id`.
2. Order by `timestamp`.
3. For the visible transcript, filter `is_message = true` and `visible = true`.
4. Render each turn by `sender_type` (`USER` / `BOT` / `SUPPORT`).
5. Compute conversation-level summary fields (channel, outcome, time range, last user message) from the grouped rows.

---

## 2. CRITICAL: chat and voice export DIFFERENT schemas

Both exports are 42 fields wide, but **the fields at positions 22–24 differ by channel.**
This is the single most important fact for building any unified view.

| Position | CHAT export | VOICE export |
| --- | --- | --- |
| 22 | `last_user_message` | `last_user_message` |
| 23 | `knowledge_sources_used` *(chat-only)* | `is_redirect_phone_number_provided` *(voice-only)* |
| 24 | `knowledge_top_source` *(chat-only)* | `knowledge_search_query` *(voice-only)* |

So:
- **Chat-only fields:** `knowledge_sources_used`, `knowledge_top_source`
- **Voice-only fields:** `is_redirect_phone_number_provided`, `knowledge_search_query`

A unified `Conversation`/`Message` type must treat these as **optional**, present only when
the row's `platform` belongs to the corresponding channel family.

---

## 3. The `platform` field — the channel key

`platform` is BotScrew's own channel identifier. The dictionary describes it as
"Channel/platform (VOICE, etc.)" — the "etc." signals an open-ended enum.

**Observed values:**
| Value | Channel family | Seen in |
| --- | --- | --- |
| `WEBSITE` | chat | Cranmore (561 rows) |
| `FB_MESSENGER` | chat | Cranmore (22 rows) |
| `VOICE_TWILIO` | voice | Mtn Collective (2,249 rows) |

**Key structural fact:** `WEBSITE` and `FB_MESSENGER` conversations ran on the **same bot**
(`bot_id` 101). One chat bot serves multiple chat connectors, tagged per-conversation by
`platform`. Voice ran on a **separate bot** (`bot_id` 248). No conversation spans more than
one platform — `platform` is fixed per conversation.

**Planned / not yet observed:** `EMAIL` (a future platform value). Adding it is consistent
with the open-enum nature of the field. Confirm with BotScrew whether `platform` is a
hard DB enum (requires migration to extend) or a loose/lookup field.

> Omni mapping: the Omni dashboard groups platforms into channel **layers**. The Chat layer's
> `connectors` (`Web`, `Facebook`, `WhatsApp`, `SMS`) correspond to chat-family `platform`
> values (`WEBSITE`, `FB_MESSENGER`, + future WhatsApp/SMS values). The Voice layer = `VOICE_TWILIO`.
> The Email layer = future `EMAIL`.

---

## 4. Enumerated fields — dictionary vs. observed

### `conversation_outcome`
| Dictionary value | Meaning (dictionary) | Observed in data? |
| --- | --- | --- |
| `UNENGAGED` | no meaningful engagement | ✅ chat (201), voice (132) |
| `RESOLVED` | solved | ⚠️ **NOT observed — data uses `SOLVED` instead** |
| `ESCALATED` | handed to support | not in these samples |
| `ABANDONED` | user dropped | not in these samples |
| `UNRESOLVED` | ended unsolved | not in these samples |
| `FAILED` | flow/process failed | not in these samples |
| `SOLVED` | — *(not in dictionary)* | ✅ chat (382), voice (2,117) |

> 🚩 **DISCREPANCY TO CONFIRM:** The dictionary lists `RESOLVED`; both real exports use
> `SOLVED`. These are almost certainly the same outcome under two names (doc drift vs.
> implementation). Confirm the canonical value with BotScrew before hardcoding. For now,
> **treat `SOLVED` as the real value** and alias `RESOLVED` → `SOLVED`.

### `current_request_status` (the escalation / live-agent state machine)
| Value | Meaning | Observed? |
| --- | --- | --- |
| `none` | no active request | ✅ all rows in both samples |
| `open` | active request | dictionary only |
| `assigned` | assigned to admin | dictionary only |
| `pending` | waiting state | dictionary only |
| `closed` | finished | dictionary only |
| `expired` | timed out | dictionary only |

> The handoff lifecycle is `none → open → assigned → … → closed`/`expired`. `assigned` is the
> moment a human takes the conversation. None of the sample conversations escalated, so only
> `none` appears. This enum is the basis for any Support-page "assign / take over" feature.
> Note the handoff *signal* differs by channel (chat: `current_request_status` + `admin_support_request.status = ASSIGNED`; voice: a `human-handover` AI action), even though this status field is shared.

### `status` (row-level delivery status)
| Value | Meaning | Observed? |
| --- | --- | --- |
| `CONVERTED` | prepared internally | ✅ chat (2), voice (2,249 — all rows) |
| `SENT` | sent | ✅ chat (2) |
| `DELIVERED` | delivered | ✅ chat (80) |
| `READ` | read | ✅ chat (499) |

> Voice rows are uniformly `CONVERTED` (no delivery/read concept for spoken turns). Chat rows
> progress through `SENT`/`DELIVERED`/`READ`. Channel-dependent.

### `sender_type`
`USER`, `BOT`, `SUPPORT`. Observed: `USER` and `BOT` only (no support takeover in samples).

### Boolean flags (`true`/`false`, may be blank if source flag missing)
| Field | Meaning |
| --- | --- |
| `is_message` | true = real message; false = technical/system row |
| `is_echo` | true = bot/system output; false = not an echo (usually user message) |
| `visible` | true = shown in support UI; false = hidden/internal |
| `is_from_support` | true = sent by a support agent |
| `user_bot` | true = bot active for user; false = paused/off |
| `is_in_working_hours` | true = inside configured team working hours |
| `is_redirect_phone_number_provided` | *(voice only)* true = redirect phone provided in handover flow |

> Observed correlation: `is_echo = true` tracks `sender_type = BOT`; `is_echo = false` tracks `USER`.

---

## 5. Field-by-field reference (full 42 fields)

Legend for **Fill**: ✅ generally filled · ⚪ often blank · 🔵 chat-only · 🟣 voice-only

### Section 1 — Conversation Core
| Field | Fill | Meaning | Notes / observed |
| --- | --- | --- | --- |
| `admin_id` | ⚪ | Support admin responsible for the row | Blank if never assigned. **Blank across all sample rows (no escalations).** Numeric. |
| `conversation_id` | ✅ | Internal conversation/thread id | Grouping key. Numeric. |
| `chat_id` | ✅ | External/user chat identifier | Channel/user chat id. |
| `bot_id` | ✅ | Bot internal id | **Numeric integer** (Cranmore chat = `101`, Mtn Collective voice = `248`). |
| `bot_name` | ✅ | Bot display name | e.g. "Cranmore Mountain Resort - ACTIVE". |
| `platform` | ✅ | **Channel** | See §3. `WEBSITE` / `FB_MESSENGER` / `VOICE_TWILIO`. |
| `status` | ⚪ | Row delivery status | See §4. |
| `conversation_outcome` | ⚪ | Final outcome | See §4. **Uses `SOLVED`, not `RESOLVED`.** |
| `current_request_status` | ⚪ | Support-request state | See §4. All sample rows `none`. |
| `timestamp` | ✅ | Row event datetime | ISO datetime. |
| `bot_datetime` | ⚪ | Bot-side datetime snapshot | From `{{bot_datetime}}` attribute. Observed offset from `timestamp` (bot timezone). |
| `record_count` | ✅ | Total exported rows | Same total repeated on every row. |

### Section 2 — Message Intelligence
| Field | Fill | Meaning | Notes / observed |
| --- | --- | --- | --- |
| `message_id` | ⚪ | Message/event id | UUID. |
| `sender_type` | ✅ | Who sent the row | `USER` / `BOT` / `SUPPORT`. |
| `message` | ⚪ | Extracted human-readable text | Blank for non-text/system events. |
| `native_message` | ⚪ | Raw original payload (JSON/text) | Chat = JSON with `action`/`message`; voice = JSON with `role`/`content`/nested `timestamp`. **Payload shape differs by channel.** |
| `formatted_chat_history` | ⚪ | One-line transcript for the row | `user: …` / `bot: …` / `support: …`. |
| `is_message` | ⚪ | Real message vs system row | true/false. |
| `is_echo` | ⚪ | Bot/system echo vs not | true/false. |
| `visible` | ⚪ | Visible in support UI | true/false. |
| `is_from_support` | ⚪ | Sent by support agent | true/false. |
| `last_user_message` | ⚪ | Latest user message snapshot attribute | Present in chat sample; **blank across voice sample**. |
| `knowledge_sources_used` | 🔵 | KB sources used (chat) | **Chat export only.** Pipe-delimited URLs observed. |
| `knowledge_top_source` | 🔵 | Top KB source (chat) | **Chat export only.** Single URL. |
| `is_redirect_phone_number_provided` | 🟣 | Redirect phone provided in voice handover | **Voice export only.** Blank across voice sample (no handovers). |
| `knowledge_search_query` | 🟣 | KB lookup query (voice) | **Voice export only.** |

### Section 3 — User Identity
| Field | Fill | Meaning | Notes / observed |
| --- | --- | --- | --- |
| `user_id` | ✅ | Internal user record id | Numeric. |
| `contact_id` | ⚪ | External contact id from channel | Blank across both samples. |
| `username` | ⚪ | Username/display name | Blank across both samples. |
| `email` | ⚪ | User email | Blank unless captured. Blank across both samples. |
| `first_name` | ⚪ | First name | Blank across both samples. |
| `last_name` | ⚪ | Last name | Blank across both samples. |
| `phone` | ⚪ | User phone number | **Filled for voice** (caller ID, e.g. `+1509…`); **blank for chat**. The voice identity anchor. |
| `user_bot` | ✅ | Bot active for user | true/false. |

### Section 4 — Behavioral Context
| Field | Fill | Meaning | Notes / observed |
| --- | --- | --- | --- |
| `device_category` | 🔵 | Device type | `MOBILE`/`DESKTOP` for `WEBSITE`; **blank for `FB_MESSENGER` and voice**. |
| `browser` | 🔵 | Browser name | `CHROME`/`SAFARI`/`FIREFOX`/`DEFAULT` for web; **blank for Messenger and voice**. |
| `browser_language` | 🔵 | Browser language | Web/widget only. |
| `language` | ⚪ | User language code | e.g. `en`. Present in both. |
| `ip_address` | ⚪ | User IP | Web only; blank for voice. |
| `ip_address_country` | ⚪ | Country from IP | e.g. `US`. |
| `country` | ⚪ | Country attribute fallback | e.g. `US`. |
| `page_url` | 🔵 | Current page URL | Web only; blank for voice. Where the session happened. |
| `website_location` | 🔵 | Website location snapshot | Web only; blank for voice. |
| `is_in_working_hours` | ⚪ | Inside configured working hours | true/false. |

---

## 6. Field-fill by platform (observed)

Entirely-blank fields across all rows of each sample export:

- **CHAT (`WEBSITE`+`FB_MESSENGER`):** `admin_id`, `contact_id`, `username`, `email`, `first_name`, `last_name`, `phone`
- **VOICE (`VOICE_TWILIO`):** `admin_id`, `last_user_message`, `is_redirect_phone_number_provided`, `contact_id`, `username`, `email`, `first_name`, `last_name`, `device_category`, `browser`, `browser_language`, `ip_address`, `page_url`, `website_location`

**Design rule for the unified Support view:** the conversation's `platform` determines which
field clusters are populated. Web fills the device/browser/page/IP cluster; voice fills the
`phone` cluster and blanks the web cluster; Messenger fills neither the device cluster nor
the identity cluster. Render the detail view **adaptively by `platform`** rather than showing
empty columns.

---

## 7. Suggested TypeScript shape (for Omni Support page)

```ts
export type Platform = 'WEBSITE' | 'FB_MESSENGER' | 'VOICE_TWILIO' | 'EMAIL';
export type ChannelFamily = 'chat' | 'voice' | 'email';

export type ConversationOutcome =
  | 'UNENGAGED' | 'SOLVED' | 'ESCALATED' | 'ABANDONED' | 'UNRESOLVED' | 'FAILED';
// NOTE: dictionary says 'RESOLVED'; real data says 'SOLVED'. Alias on ingest.

export type RequestStatus =
  | 'none' | 'open' | 'assigned' | 'pending' | 'closed' | 'expired';

export type SenderType = 'USER' | 'BOT' | 'SUPPORT';
export type RowStatus = 'CONVERTED' | 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  messageId?: string;
  senderType: SenderType;
  text?: string;            // `message`
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

export interface Conversation {
  conversationId: string;
  chatId: string;
  botId: number;            // integer (101, 248, …)
  botName: string;
  platform: Platform;
  channelFamily: ChannelFamily;   // derived from platform
  outcome?: ConversationOutcome;
  requestStatus: RequestStatus;
  startedAt: string;
  endedAt: string;
  // identity (sparse; varies by platform)
  userId?: string;
  phone?: string;           // voice anchor
  email?: string;
  language?: string;
  country?: string;
  // behavioral (web-heavy; sparse for voice/messenger)
  deviceCategory?: string;
  browser?: string;
  pageUrl?: string;
  isInWorkingHours?: boolean;
  messages: Message[];
}

export function channelFamily(p: Platform): ChannelFamily {
  if (p === 'VOICE_TWILIO') return 'voice';
  if (p === 'EMAIL') return 'email';
  return 'chat'; // WEBSITE, FB_MESSENGER, future WhatsApp/SMS
}
```

---

## 8. Open questions for BotScrew (still-closed parts of the box)

These are NOT answered by the export or dictionary and remain the highest-value asks:

1. **Runtime/conversation lifecycle.** From inbound message to response: where is the system
   prompt injected? Order/precedence of knowledge retrieval vs. flows vs. AI actions? What
   wins when they conflict?
2. **Configuration surface.** Per bot, what is editable and via what mechanism (UI vs. API vs.
   their dev team)? Real system-prompt character limit? How does knowledge retrieval select
   sources (relates to `knowledge_top_source` / `knowledge_search_query`)?
3. **API access.** Is there an API to push knowledge, read conversations, or configure bots —
   or is manual export the only egress and UI the only config path? This determines whether
   GetSkiBots can build *against* the platform or only *alongside* it.
4. **`platform` enum extensibility.** Hard DB enum (migration to add `EMAIL`) or loose field?
5. **`SOLVED` vs `RESOLVED`.** Which is canonical?
6. **One bot, multiple channels.** Chat already serves `WEBSITE`+`FB_MESSENGER` on one bot.
   Can voice (`VOICE_TWILIO`) be brought onto the same bot so one resort = one bot across all
   channels, with behavior selected by `platform`? Or is voice required to be a separate bot?
