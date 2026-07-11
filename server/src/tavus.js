// Thin client for the Tavus CVI API (https://docs.tavus.io).
// Tavus renders the real-time photorealistic video + lip-sync. We plug in our
// own brain (Claude, via the proxy) and voice (ElevenLabs) through the persona.
const TAVUS_BASE = 'https://tavusapi.com/v2';

function headers(apiKey) {
  return { 'x-api-key': apiKey, 'Content-Type': 'application/json' };
}

async function tavusFetch(apiKey, path, options = {}) {
  const res = await fetch(`${TAVUS_BASE}${path}`, {
    ...options,
    headers: { ...headers(apiKey), ...(options.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Tavus ${options.method || 'GET'} ${path} -> ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

// Build the layered persona. llmLayer/ttsLayer are optional overrides.
export async function createPersona({ apiKey, systemPrompt, replicaId, llmLayer, ttsLayer }) {
  const layers = {};
  if (llmLayer) layers.llm = llmLayer;
  if (ttsLayer) layers.tts = ttsLayer;

  const body = {
    persona_name: 'Chelsey',
    system_prompt: systemPrompt,
    context: '',
    default_replica_id: replicaId || undefined,
    layers,
  };
  const data = await tavusFetch(apiKey, '/personas', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.persona_id;
}

export async function createConversation({ apiKey, replicaId, personaId, greeting }) {
  const body = {
    replica_id: replicaId,
    persona_id: personaId,
    conversation_name: 'Chelsey & ACE',
    custom_greeting: greeting || undefined,
    properties: {
      // She hangs up gracefully if he walks away for a while.
      participant_left_timeout: 60,
      participant_absent_timeout: 300,
      language: 'english',
    },
  };
  const data = await tavusFetch(apiKey, '/conversations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { conversationId: data.conversation_id, conversationUrl: data.conversation_url };
}

export async function endConversation({ apiKey, conversationId }) {
  return tavusFetch(apiKey, `/conversations/${conversationId}/end`, { method: 'POST' });
}
