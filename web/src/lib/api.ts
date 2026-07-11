// Talks to our backend (same origin via the Vite proxy). The web app never sees
// any API key — the server holds them.

export interface Health {
  ok: boolean;
  name: string;
  ready: boolean; // Tavus key + replica present → we can start a call
  brain: 'claude' | 'tavus-native';
  voice: 'elevenlabs' | 'tavus-default';
  missing: string[];
}

export interface Conversation {
  conversationUrl: string;
  conversationId: string;
}

export async function getHealth(): Promise<Health> {
  const r = await fetch('/api/health');
  if (!r.ok) throw new Error('server unreachable');
  return r.json();
}

export async function startConversation(): Promise<Conversation> {
  const r = await fetch('/api/conversation', { method: 'POST' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'Could not start the call.');
  return data;
}

export async function endConversation(id: string): Promise<void> {
  await fetch(`/api/conversation/${id}/end`, { method: 'POST' }).catch(() => {});
}
