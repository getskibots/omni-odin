# Voice channel — provider routing design

Captures the decided design for voice provider selection (OpenAI Realtime vs
ElevenLabs) and where it lives in the dashboard. Companion to the substrate
docs in `../reference/` (especially `ODIN_API_SURFACE.md` voice findings).

## Current state vs. goal

- **Botscrew production voice today = OpenAI GPT Realtime** (fused speech-to-speech).
  ElevenLabs is NOT currently an exposed option.
- **Goal:** add **ElevenLabs custom voices** as a production option (the 9 prebaked
  GSB voices are the differentiator — branded, resort-specific voice).

## Why this is "enable," not "build"

Odin already supports ElevenLabs natively:
- Odin **Voice SDK is ElevenLabs-based** (`@elevenlabs/react`)
- Odin API: `/elevenlabs/signed-url`, `/elevenlabs/agent/edit`, `/integrations/elevenlabs/voices`

So enabling ElevenLabs is provisioning/config on a capability Odin has — Botscrew
just hasn't exposed it (their voice is OpenAI-Realtime-only today).

## The two pipelines + two contexts

OpenAI Realtime and ElevenLabs are different architectures:
- **OpenAI Realtime** = one fused speech-to-speech model (STT+LLM+TTS)
- **ElevenLabs Conversational AI** = ElevenLabs voice + your LLM + STT, orchestrated

Two voice contexts:
- **Browser voice** (testing, web) → Odin Voice SDK / omni's `elevenLabsVoice.ts` — works now
- **Production phone** → Twilio bridge. OpenAI today; ElevenLabs phone = Twilio →
  **ElevenLabs Conversational AI** (ElevenLabs publishes a Twilio guide). That bridge
  rewire is a Botscrew telephony task, selectable per bot.

## ⚙️ DECIDED: provider routing lives in Settings → Channels → Voice

The "route this Twilio number to OpenAI Realtime vs ElevenLabs" selector belongs in
**Settings → Channels → Voice** (the wiring layer), NOT Knowledge.

**Rationale:** it pairs with the Twilio number (already in Settings → Channels);
switching providers = re-pointing the Twilio webhook (an infra/deploy action).
Mirrors omni's split: Knowledge = brain (what it says / how it sounds), Settings =
plumbing (numbers, connectors, routing).

```
Settings → Channels → Voice (the routing)
   Twilio number:  +1 307·284·5392
   Voice engine:   ( ) OpenAI Realtime   (•) ElevenLabs Conversational AI
   Status:         ● Connected

Knowledge → Voice (the character)
   Voice:  [ Autumn ▾ ]   ← voice list FILTERED to the engine chosen in Settings
   Instructions · Welcome message · Model
```

One decision in Settings (the engine); Knowledge adapts (shows the right voices).
Can't accidentally pick an ElevenLabs voice on an OpenAI-routed number.

## Data model

Add to `src/data/model.ts::VoiceChannelConfig`:
```ts
voiceProvider: 'OPENAI_REALTIME' | 'ELEVENLABS';
```
- **Set** in Settings → Channels → Voice
- **Read** by Knowledge → Voice to filter the voice picker
- **Read** by the production Twilio bridge to point the webhook at the right handler

(omni-odin's test modal already switches via `isOpenAIVoice()`; this makes the
choice an explicit, persisted config field instead of implicit in the voice name.)

## Scope

Per voice channel (one resort = one engine). Per-number-different-engine is a
future extension — don't over-build.

## No Botscrew voice reference exists

Searched all 66 Botscrew product docs: the only Twilio doc is **SMS-only**
(`/api/twilio/event/{bot_id}`); the only OpenAI mention is the chat NLP/KB LLM.
Voice (VOICE_TWILIO) is **undocumented** — a custom/newer capability. So for the
Botscrew conversation: ASK how their voice service is wired + whether it can route
to ElevenLabs. GSB's own working references: `src/lib/realtimeVoice.ts` (OpenAI
Realtime GA WebRTC) + `src/lib/elevenLabsVoice.ts` (ElevenLabs ConvAI).

## Tuesday ask

> "Odin already supports ElevenLabs (Voice SDK + `/elevenlabs` API). Botscrew's
> voice is OpenAI-Realtime-only today and isn't in your docs. We want ElevenLabs
> custom voices as a per-bot option — here's our working prototype. What would it
> take to route a bot's Twilio voice to ElevenLabs Conversational AI?"
