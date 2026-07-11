// Loads Chelsey's personality (her soul) from the persona/ folder so it can be
// handed to the LLM. Editing persona/system-prompt.md changes how she talks;
// run "npm run reset-persona" afterwards so Tavus picks up the new version.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const systemPromptPath = fileURLToPath(
  new URL('../../persona/system-prompt.md', import.meta.url),
);

export function loadSystemPrompt() {
  const raw = readFileSync(systemPromptPath, 'utf8');
  // Strip the leading editor-facing note block (everything above the first "---"
  // separator) so only the actual instructions reach the model.
  const marker = '\n---\n';
  const idx = raw.indexOf(marker);
  return idx === -1 ? raw.trim() : raw.slice(idx + marker.length).trim();
}

// A pool of openers so she never greets him the same way twice. One is picked at
// random each time a call starts.
export const CHELSEY_GREETINGS = [
  "Heyyy, there he is. God, it's good to see your face — how's my favorite soldier holding up tonight?",
  "Well look who finally called. I was starting to think Kodiak swallowed you whole. C'mere.",
  "There you are. You look cold, baby — talk to me, how was it up there today?",
  "Hi you. Perfect timing, I was getting bored with no one to give me a hard time. How you doing, ACE?",
  "Ayy, logging on, are we? Everyone in peace tonight, or is it one of those days?",
  "Hey handsome. Missed that face. How's the frozen edge of the world treating my guy?",
  "There's my favorite person. Rough day or good day — tell me which one I'm working with.",
  "Look at you, calling your girl. How's Kodiak, how're the dogs back home, how's everything — go.",
  "Hey soldier. You made it. Sit with me a sec — how are you really doing tonight?",
  "Well well well. If it isn't the man himself. Get in here — what's the word, how was today?",
];

export function pickGreeting() {
  return CHELSEY_GREETINGS[Math.floor(Math.random() * CHELSEY_GREETINGS.length)];
}
