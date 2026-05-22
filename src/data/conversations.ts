export type Channel = 'chat' | 'voice' | 'email';
export type ChatConnector = 'web' | 'facebook' | 'whatsapp' | 'sms';
export type AttentionFlag =
  | 'human-requested'
  | 'tool-failed'
  | 'missed-call'
  | 'unanswered'
  | 'negative-sentiment'
  | 'failed-booking';

export interface Message {
  from: 'bot' | 'user';
  text: string;
  time: string;
  toolCall?: { name: string; failed?: boolean };
  audioDuration?: string;
}

export interface Conversation {
  id: string;
  channel: Channel;
  connector?: ChatConnector;
  identityLabel: string;
  identitySub?: string;
  preview: string;
  time: string;
  unread: number;
  flags: AttentionFlag[];
  subject?: string;
  callDuration?: string;
  messages: Message[];
  linkedConversationIds?: string[];
}

export const conversations: Conversation[] = [
  {
    id: 'v-1',
    channel: 'voice',
    identityLabel: 'Sarah M.',
    identitySub: '+1 307·555·0192',
    preview: "I'm sorry, I couldn't retrieve the latest snow report right now…",
    time: 'Today · 10:32 AM',
    unread: 1,
    flags: ['tool-failed'],
    callDuration: '02:14',
    messages: [
      { from: 'bot', text: 'Welcome to Jackson Hole Mountain Resort. How can I help you today?', time: '10:32', audioDuration: '00:05' },
      { from: 'user', text: 'Yeah, I was curious how much snowfall you’ve had in the last 24 hours.', time: '10:32' },
      { from: 'bot', text: '', time: '10:32', toolCall: { name: 'get_snow_report', failed: true } },
      { from: 'bot', text: "I'm sorry, I couldn't retrieve the latest snow report right now. Would you like me to try again or help you with something else?", time: '10:33', audioDuration: '00:08' },
      { from: 'user', text: 'Nope, that’s okay. Thank you. Bye.', time: '10:33' },
      { from: 'bot', text: "You're welcome! Have a great day and take care.", time: '10:33', audioDuration: '00:03' },
    ],
    linkedConversationIds: ['e-1'],
  },
  {
    id: 'v-2',
    channel: 'voice',
    identityLabel: '+1 720·555·0834',
    preview: 'Missed call — no voicemail',
    time: 'Today · 09:18 AM',
    unread: 1,
    flags: ['missed-call'],
    callDuration: '00:00',
    messages: [],
  },
  {
    id: 'v-3',
    channel: 'voice',
    identityLabel: 'Marcus T.',
    identitySub: '+1 415·555·2287 · return caller',
    preview: 'Booked private lesson for Saturday',
    time: 'Today · 08:42 AM',
    unread: 0,
    flags: [],
    callDuration: '03:51',
    messages: [
      { from: 'bot', text: 'Welcome back, Marcus. How can we help today?', time: '08:42', audioDuration: '00:04' },
      { from: 'user', text: 'Want to book a private lesson Saturday morning, two adults.', time: '08:43' },
      { from: 'bot', text: 'Got it — two adults, Saturday morning. We have 9 AM and 11 AM open. Which works?', time: '08:43', audioDuration: '00:07' },
      { from: 'user', text: '9 AM.', time: '08:43' },
      { from: 'bot', text: 'Booking Saturday 9 AM private lesson for two adults — did I get that right?', time: '08:43', audioDuration: '00:06' },
      { from: 'user', text: 'Yep.', time: '08:43' },
      { from: 'bot', text: '', time: '08:44', toolCall: { name: 'book_private_lesson' } },
      { from: 'bot', text: 'Booked. You’ll get a confirmation text in a minute. Anything else?', time: '08:44', audioDuration: '00:05' },
    ],
  },
  {
    id: 'c-1',
    channel: 'chat',
    connector: 'web',
    identityLabel: 'Widget user',
    identitySub: 'Bozeman, MT',
    preview: 'Ticket prices for the Aerial Tram (including any discounts)…',
    time: 'Today · 11:08 AM',
    unread: 3,
    flags: [],
    messages: [
      { from: 'bot', text: 'Welcome to Jackson Hole! How can I help you today?', time: '11:07' },
      { from: 'user', text: 'Ticket prices for the Aerial Tram?', time: '11:07' },
      { from: 'bot', text: 'Aerial Tram tickets are $50 adult / $25 youth / free for kids under 6. Sightseeing-only pricing — separate from lift tickets.', time: '11:08' },
      { from: 'user', text: 'Any military discount?', time: '11:08' },
      { from: 'bot', text: 'Yes — military discounts apply for Aerial Tram sightseeing. Bring ID at the ticket window for the rate.', time: '11:08' },
    ],
  },
  {
    id: 'c-2',
    channel: 'chat',
    connector: 'sms',
    identityLabel: '+1 208·555·4471',
    preview: 'Can I cancel for a full refund?',
    time: 'Today · 10:55 AM',
    unread: 1,
    flags: ['negative-sentiment'],
    messages: [
      { from: 'user', text: 'For summer sightseeing, can I cancel for a full refund if the weather is bad?', time: '10:54' },
      { from: 'bot', text: 'Yes — for summer sightseeing, you can cancel for a full refund up to 24 hours before your visit.', time: '10:55' },
      { from: 'user', text: 'And if I just don\'t show up?', time: '10:55' },
      { from: 'bot', text: 'No-shows are non-refundable. If something comes up, cancel before the 24-hour window and we’ll refund in full.', time: '10:55' },
      { from: 'user', text: 'That\'s ridiculous.', time: '10:55' },
    ],
  },
  {
    id: 'c-3',
    channel: 'chat',
    connector: 'facebook',
    identityLabel: 'Emma R.',
    identitySub: 'via Facebook',
    preview: "Grand Adventure Camp is a kids-only day camp, not a family…",
    time: 'Today · 09:30 AM',
    unread: 0,
    flags: [],
    messages: [
      { from: 'user', text: 'Is Grand Adventure Camp something parents can do too?', time: '09:29' },
      { from: 'bot', text: 'Grand Adventure Camp is a kids-only day camp, not a family activity. For something to do together, look at sightseeing on the Aerial Tram or a guided wildlife tour.', time: '09:30' },
    ],
  },
  {
    id: 'c-4',
    channel: 'chat',
    connector: 'web',
    identityLabel: 'Widget user',
    preview: 'I want to speak with someone please',
    time: 'Yesterday · 04:12 PM',
    unread: 2,
    flags: ['human-requested'],
    messages: [
      { from: 'user', text: 'I want to speak with someone please', time: '16:11' },
      { from: 'bot', text: 'Of course — let me connect you with our guest services team. One moment.', time: '16:12' },
    ],
  },
  {
    id: 'e-1',
    channel: 'email',
    identityLabel: 'Sarah Mitchell',
    identitySub: 'sarah.m@example.com',
    preview: 'Re: Snow report for this weekend',
    time: 'Today · 11:14 AM',
    unread: 1,
    flags: [],
    subject: 'Snow report for this weekend',
    messages: [
      { from: 'user', text: 'Hi — calling didn’t get me a snow report (your bot timed out). Could you send the latest base depth and trail count? Planning a trip this weekend with the kids. Thanks, Sarah', time: '11:10' },
      { from: 'bot', text: 'Hi Sarah,\n\nApologies for the trouble on the phone earlier. Here’s the latest:\n\n• 2 inches new snow in the last 24 hours\n• 88-inch base depth\n• 110 trails open, 13 lifts running\n\nConditions are variable, so the lower mountain may have softer surfaces by afternoon. Let me know if you’d like lift ticket info or lesson availability for the weekend.\n\nVirtual Assistant\nJackson Hole Mountain Resort', time: '11:14' },
    ],
    linkedConversationIds: ['v-1'],
  },
  {
    id: 'e-2',
    channel: 'email',
    identityLabel: 'David Park',
    identitySub: 'dpark@globalskigroups.com',
    preview: 'Group rate quote — 22 guests, March 14–17',
    time: '2d ago · 03:21 PM',
    unread: 0,
    flags: ['unanswered'],
    subject: 'Group rate quote — 22 guests, March 14–17',
    messages: [
      { from: 'user', text: 'Hi — looking for group pricing for 22 guests, March 14–17. Mix of adults and teens. We need lift tickets + lessons for the first day. Can you send a quote?', time: '03:21' },
    ],
  },
];
