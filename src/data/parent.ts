export type ChannelStatus = 'active' | 'not-connected';

export interface ChannelSummary {
  id: 'chat' | 'voice' | 'email';
  label: string;
  icon: string;
  botscrewBotId: string | null;
  status: ChannelStatus;
  meta: string;
  overrideChars: number;
  assembledChars: number | null;
  connectors?: string[];
  route: string;
}

export interface ParentSummary {
  id: string;
  name: string;
  defaultModel: string;
  systemRolePrompt: string;
  systemRoleChars: number;
  systemRoleLimit: number;
  knowledge: {
    textEdits: number;
    files: number;
    websites: { count: number; lastSync: string };
  };
  channels: ChannelSummary[];
}

export const jacksonHole: ParentSummary = {
  id: 'jh',
  name: 'Jackson Hole - ACTIVE',
  defaultModel: 'gpt-5.2',
  systemRoleChars: 12041,
  systemRoleLimit: 15000,
  systemRolePrompt:
    `A friendly Virtual Assistant for Jackson Hole Mountain Resort. Speak as "we/us." Be empathetic, accurate, and clear. Use a warm, conversational tone.

Personas (detect from guest wording, goals, context):
  • Adventure Families
  • First Timer
  • Snow Chasers
  • Core / Local JHMR Passholders
  • International Visitors

Policies:
  • Don't give Guest Service phone number unless specifically asked.
  • Do not tell stories, hallucinate, or share personal opinions.
  • Identify as a Virtual Assistant, never as "AI."
  • Do not refer to yourself in third person.

(Channel-specific rules — length, formatting, fallback language — live on each channel's page, not here.)`,
  knowledge: {
    textEdits: 37,
    files: 12,
    websites: { count: 1, lastSync: '2 days ago' },
  },
  channels: [
    {
      id: 'chat',
      label: 'Chat',
      icon: '💬',
      botscrewBotId: 'bs_8721',
      status: 'active',
      meta: 'Connectors: Web · Facebook · WhatsApp · SMS',
      overrideChars: 1420,
      assembledChars: 13461,
      connectors: ['Web', 'Facebook', 'WhatsApp', 'SMS'],
      route: '/channels/chat',
    },
    {
      id: 'voice',
      label: 'Voice',
      icon: '📞',
      botscrewBotId: 'bs_9034',
      status: 'active',
      meta: 'Twilio: +1 307·284·5392',
      overrideChars: 890,
      assembledChars: 12931,
      route: '/channels/voice',
    },
    {
      id: 'email',
      label: 'Email',
      icon: '✉️',
      botscrewBotId: null,
      status: 'not-connected',
      meta: 'Connect an inbound address to enable email replies.',
      overrideChars: 0,
      assembledChars: null,
      route: '/channels/email',
    },
  ],
};
