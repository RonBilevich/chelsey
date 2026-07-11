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

export const CHELSEY_GREETING =
  "Heyyy, there he is. God, it's good to see your face, ACE. How's Kodiak treating you tonight — you keeping warm up there?";
