import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { loadSystemPrompt, pickGreeting } from './persona.js';
import { createPersona, createConversation, endConversation } from './tavus.js';
import { chatCompletions } from './claude.js';

const PORT = process.env.PORT || 8787;
const personaCachePath = fileURLToPath(new URL('../.persona-id', import.meta.url));

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim()),
  }),
);

// ── config helpers ──────────────────────────────────────────────────────────
const env = (k) => (process.env[k] || '').trim();
const useClaude = env('USE_CLAUDE') === 'true';
const claudeReachable = useClaude && !!env('PUBLIC_URL') && !!env('ANTHROPIC_API_KEY');

function missingKeys() {
  const missing = [];
  if (!env('TAVUS_API_KEY')) missing.push('TAVUS_API_KEY');
  if (!env('TAVUS_REPLICA_ID')) missing.push('TAVUS_REPLICA_ID');
  if (!env('ELEVENLABS_API_KEY')) missing.push('ELEVENLABS_API_KEY (voice)');
  if (!env('ELEVENLABS_VOICE_ID')) missing.push('ELEVENLABS_VOICE_ID (voice)');
  if (useClaude && !env('ANTHROPIC_API_KEY')) missing.push('ANTHROPIC_API_KEY (brain)');
  if (useClaude && !env('PUBLIC_URL')) missing.push('PUBLIC_URL (so Tavus can reach Claude)');
  return missing;
}

// ── persona (create once, cache the id) ─────────────────────────────────────
async function ensurePersona() {
  if (env('TAVUS_PERSONA_ID')) return env('TAVUS_PERSONA_ID');
  if (existsSync(personaCachePath)) {
    const cached = readFileSync(personaCachePath, 'utf8').trim();
    if (cached) return cached;
  }

  const systemPrompt = loadSystemPrompt();

  const llmLayer = claudeReachable
    ? {
        model: env('CLAUDE_MODEL') || 'claude-opus-4-8',
        base_url: `${env('PUBLIC_URL').replace(/\/$/, '')}/v1`,
        api_key: 'chelsey-proxy', // our proxy ignores this; Tavus requires a value
        speculative_inference: true,
      }
    : undefined;

  const ttsLayer = env('ELEVENLABS_API_KEY')
    ? {
        tts_engine: 'elevenlabs',
        api_key: env('ELEVENLABS_API_KEY'),
        external_voice_id: env('ELEVENLABS_VOICE_ID') || undefined,
      }
    : undefined;

  console.log(
    `[persona] creating Chelsey — brain=${claudeReachable ? 'Claude' : 'Tavus-native'}, voice=${
      ttsLayer ? 'ElevenLabs' : 'Tavus-default'
    }`,
  );
  const personaId = await createPersona({
    apiKey: env('TAVUS_API_KEY'),
    systemPrompt,
    replicaId: env('TAVUS_REPLICA_ID'),
    llmLayer,
    ttsLayer,
  });
  writeFileSync(personaCachePath, personaId);
  return personaId;
}

// ── routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const missing = missingKeys();
  res.json({
    ok: true,
    name: 'Chelsey',
    ready: !!env('TAVUS_API_KEY') && !!env('TAVUS_REPLICA_ID'),
    brain: claudeReachable ? 'claude' : 'tavus-native',
    voice: env('ELEVENLABS_API_KEY') ? 'elevenlabs' : 'tavus-default',
    missing,
  });
});

app.post('/api/conversation', async (_req, res) => {
  if (!env('TAVUS_API_KEY') || !env('TAVUS_REPLICA_ID')) {
    return res.status(400).json({
      error: 'Chelsey needs her Tavus setup first.',
      missing: missingKeys(),
    });
  }
  try {
    const personaId = await ensurePersona();
    const convo = await createConversation({
      apiKey: env('TAVUS_API_KEY'),
      replicaId: env('TAVUS_REPLICA_ID'),
      personaId,
      greeting: pickGreeting(),
    });
    res.json(convo);
  } catch (err) {
    console.error('[conversation] ', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/conversation/:id/end', async (req, res) => {
  try {
    await endConversation({ apiKey: env('TAVUS_API_KEY'), conversationId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OpenAI-compatible endpoint Tavus calls for Chelsey's replies (backed by Claude).
app.post('/v1/chat/completions', chatCompletions);

// Serve the built web app so the whole thing is ONE service at ONE URL — that's
// what makes a single shareable link (or a public tunnel) work with no CORS.
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/v1')) return next();
    res.sendFile(fileURLToPath(new URL('../../web/dist/index.html', import.meta.url)));
  });
  console.log('  Serving the web app from web/dist');
}

app.listen(PORT, () => {
  console.log(`\n  Chelsey server on http://localhost:${PORT}`);
  const missing = missingKeys();
  if (missing.length) {
    console.log('  Waiting on:', missing.join(', '));
  } else {
    console.log('  All keys present — Chelsey is ready to call. ✨');
  }
  console.log('');
});
