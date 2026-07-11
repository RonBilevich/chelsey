// Chelsey's brain. Tavus's "custom LLM" feature speaks the OpenAI Chat
// Completions protocol, so we expose one endpoint that looks like OpenAI on the
// outside and calls Claude (Anthropic) on the inside. This is what lets Chelsey's
// authentic personality drive a real-time video avatar.
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';

let client;
function anthropic() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// Split an OpenAI-style messages array into Anthropic's (system, messages) shape.
function toAnthropic(messages = []) {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join('\n\n');

  const turns = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
    }));

  return { system, turns };
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

// Express handler for POST /v1/chat/completions (streaming + non-streaming).
export async function chatCompletions(req, res) {
  // Only Tavus (which sends our shared secret as a Bearer token) may use this
  // public endpoint — otherwise anyone could burn Anthropic tokens.
  const secret = process.env.PROXY_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: { message: 'unauthorized' } });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: { message: 'ANTHROPIC_API_KEY not set' } });
  }

  const { messages, stream = true, temperature = 0.9, max_tokens = 300 } = req.body || {};
  const { system, turns } = toAnthropic(messages);
  const id = `chatcmpl-${Math.round(process.hrtime()[1])}`;

  try {
    if (!stream) {
      const msg = await anthropic().messages.create({
        model: MODEL,
        system,
        messages: turns,
        max_tokens,
        temperature,
      });
      const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
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
    res.flushHeaders?.();

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    send(openAIChunk(id, { role: 'assistant', content: '' }));

    const anthropicStream = await anthropic().messages.create({
      model: MODEL,
      system,
      messages: turns,
      max_tokens,
      temperature,
      stream: true,
    });

    for await (const event of anthropicStream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        send(openAIChunk(id, { content: event.delta.text }));
      }
    }

    send(openAIChunk(id, {}, 'stop'));
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[claude] error:', err.message);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: { message: err.message } });
    }
  }
}
