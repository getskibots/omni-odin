import { mountainCollective } from '../data/seed';
import type { Channel, ChannelFamily, Platform } from '../data/model';
import { LayerIcon } from '../components/LayerIcon';

/**
 * Settings → Channels.
 *
 * Migrated to read from the substrate-aligned model (Resort/Channel) via
 * `seed.ts`. The Channel shape is wider than the old ChannelLayer — this page
 * derives the display fields (label/wiring/connectors) from the new structural
 * fields inline rather than carrying compatibility shapes.
 *
 * UI is unchanged from the omni original (per the brief: no redesign in this pass).
 */
export default function SettingsChannels() {
  return (
    <div className="px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
          Settings
        </div>
        <h1 className="text-2xl font-semibold text-ink-900 mt-1">Channels</h1>
        <p className="text-sm text-slate-500 mt-1">
          Wire up where the bot lives. Edit channel instructions in{' '}
          <a href="#/knowledge" className="text-botscrew-500 hover:underline">
            Knowledge → Instructions
          </a>
          .
        </p>
      </header>

      <div className="space-y-4">
        {mountainCollective.channels.map((c) => {
          const display = displayFor(c);
          const isActive = c.status === 'ACTIVE';
          return (
            <div
              key={c.channelId}
              className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden"
            >
              <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <LayerIcon id={c.family} className="h-6 w-6 text-slate-600" />
                  <div>
                    <div className="font-semibold text-ink-900">{display.label}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {c.botscrewBotId != null ? `bs_${c.botscrewBotId}` : '—'}
                    </div>
                  </div>
                </div>
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Not connected
                  </span>
                )}
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="text-sm text-slate-600">{display.wiring}</div>
                {display.connectors && display.connectors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {display.connectors.map((conn) => (
                      <span
                        key={conn}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-botscrew-50 text-botscrew-700 border border-botscrew-100"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-botscrew-500" />
                        {conn}
                      </span>
                    ))}
                  </div>
                )}
                <div className="pt-1">
                  <button className="text-sm font-medium text-botscrew-500 hover:text-botscrew-600">
                    {isActive ? 'Configure wiring' : 'Connect'} →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Derive display strings from the substrate-aligned `Channel`.
 *
 * The old ChannelLayer carried hand-authored `label`, `wiring`, and `connectors`
 * fields; the new model has structural fields (`family`, `platforms`,
 * `voice.twilio`, etc.) and we compute display from them.
 */
function displayFor(c: Channel): {
  label: string;
  wiring: string;
  connectors?: string[];
} {
  const label = familyLabel(c.family);
  if (c.family === 'voice') {
    const numbers = c.voice?.twilio?.phoneNumbers ?? [];
    const wiring =
      numbers.length > 0
        ? `Twilio: ${numbers.map((n) => n.number).join(' · ')}`
        : c.status === 'ACTIVE'
          ? 'Twilio: configured'
          : 'Twilio number not connected.';
    return { label, wiring };
  }
  if (c.family === 'email') {
    const wiring = c.email?.oauth.connected
      ? `${c.email.provider === 'MICROSOFT_365' ? 'Microsoft 365' : 'Gmail'}: ${c.email.mailbox}`
      : 'Connect an inbound address to enable email replies.';
    return { label, wiring };
  }
  // chat
  const connectors = c.platforms.map(platformLabel);
  const wiring = `Connectors: ${connectors.join(' · ')}`;
  return { label, wiring, connectors };
}

function familyLabel(f: ChannelFamily): string {
  if (f === 'chat') return 'Chat';
  if (f === 'voice') return 'Voice';
  return 'Email';
}

function platformLabel(p: Platform): string {
  switch (p) {
    case 'WEBSITE':
      return 'Web';
    case 'FB_MESSENGER':
      return 'Facebook';
    case 'VOICE_TWILIO':
      return 'Twilio';
    case 'EMAIL':
      return 'Email';
    default:
      return p;
  }
}
