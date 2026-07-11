// Chelsey's brain. Tavus's "custom LLM" feature speaks the OpenAI Chat
// Completions protocol, so we expose one endpoint that looks like OpenAI on the
// outside and calls Claude (Anthropic) on the inside.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';

let client;
function anthropic() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// Split OpenAI-style messages into Anthropic's (system, messages) shape.
function toAnthropic(messages = []) {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join('\n\n');

  let turns = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
    }))
    .filter((m) => m.content.trim().length > 0);

  // Anthropic requires the first turn to be from the user and at least one turn.
  while (turns.length && turns[0].role === 'assistant') turns.shift();
  if (turns.length === 0) turns = [{ role: 'user', content: 'Hey.' }];

  return { system, turns };
}

// Accept the shared secret however Tavus sends it: "Authorization: Bearer X",
// "Authorization: X", or "x-api-key: X".
function providedSecret(req) {
  const a = req.headers.authorization || '';
  if (a.startsWith('Bearer ')) return a.slice(7).trim();
  if (a) return a.trim();
  if (req.headers['x-api-key']) return String(req.headers['x-api-key']).trim();
  return '';
}

function openAIChunk(id, delta, finish = null) {
  return {
    id,
    object: 'chat.completion.chunk',
    created: 0,
    model: MODEL,
    choices: [{ index: 0, delta, finish_reason: finish }],
  };
}

// Wrap the (long, unchanging) system prompt in a cached block so we're not billed
// full price for it on every single turn of a live conversation (~90% cheaper).
function systemParam(system) {
  if (!system) return undefined;
  return [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
}

// Plain (non-streaming) generation — used by /api/selftest and non-stream calls.
export async function runClaude({ system, messages, maxTokens = 200 }) {
  const msg = await anthropic().messages.create({
    model: MODEL,
    system: systemParam(system),
    messages,
    max_tokens: maxTokens,
  });
  return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

export async function chatCompletions(req, res) {
  const secret = process.env.PROXY_SECRET;
  if (secret && providedSecret(req) !== secret) {
    console.warn(
      `[proxy] 401 — auth mismatch (authHeader=${!!req.headers.authorization}, x-api-key=${!!req
        .headers['x-api-key']})`,
    );
    return res.status(401).json({ error: { message: 'unauthorized' } });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: { message: 'ANTHROPIC_API_KEY not set' } });
  }

  const { messages, stream = true, max_tokens = 250 } = req.body || {};
  const { system, turns } = toAnthropic(messages);
  console.log(`[proxy] chat: msgs=${(messages || []).length} turns=${turns.length} stream=${stream}`);

  const id = `chatcmpl-${Math.round(process.hrtime()[1])}`;

  try {
    if (!stream) {
      const text = await runClaude({ system, messages: turns, maxTokens: max_tokens });
      console.log(`[proxy] ok (non-stream), ${text.length} chars`);
      return res.json({
        id,
        object: 'chat.completion',
        model: MODEL,
        choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // don't let any proxy buffer the stream
    res.flushHeaders?.();

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    send(openAIChunk(id, { role: 'assistant', content: '' }));

    let chars = 0;
    const anthropicStream = await anthropic().messages.create({
      model: MODEL,
      system: systemParam(system),
      messages: turns,
      max_tokens,
      stream: true,
    });

    for await (const event of anthropicStream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        chars += event.delta.text.length;
        send(openAIChunk(id, { content: event.delta.text }));
      }
    }

    send(openAIChunk(id, {}, 'stop'));
    res.write('data: [DONE]\n\n');
    res.end();
    console.log(`[proxy] ok (stream), ${chars} chars`);
  } catch (err) {
    console.error('[proxy] ERROR:', err?.status || '', err?.message);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: { message: err.message } });
    }
  }
}
