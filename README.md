# Chelsey — a digital companion for ACE

A mobile-first app of a photorealistic, real-time video companion, **Chelsey**,
built for **ACE** while he works up in Kodiak, Alaska. She talks live (voice +
video, real lip-sync), keeps him company, knows him and the crew, and doubles as
an assistant.

Built by his friend Bill, with Claude.

```
┌─────────────────────────────────────────────────────────────┐
│  web/     mobile web app ACE opens (React + Vite + Tailwind) │
│              │  "Call Chelsey"                                │
│              ▼                                                │
│  server/  backend — holds the API keys, starts the call      │
│              ├─ Tavus      → live video avatar + lip-sync     │
│              ├─ ElevenLabs → her voice                        │
│              └─ Claude     → her brain / personality          │
│                                                               │
│  persona/ WHO she is (character bible + system prompt)        │
└─────────────────────────────────────────────────────────────┘
```

## Run it

You need Node 18+ (this machine has v24). Two terminals:

**1. Backend**
```bash
cd server
npm install
cp .env.example .env      # then fill in keys as you get them (see below)
npm run dev               # http://localhost:8787
```

**2. Web app**
```bash
cd web
npm install
npm run dev               # http://localhost:5173  (also on your phone via the LAN URL Vite prints)
```

Open `http://localhost:5173`. With no keys yet you'll see Chelsey's home screen
and a **setup checklist**. As you add each key and restart the server, the
checklist fills in — and once Tavus is set, the **Call Chelsey** button goes live.

### On ACE's phone
`npm run dev` prints a `Network:` URL (e.g. `http://192.168.1.20:5173`). Open that
on the phone (same Wi-Fi) and "Add to Home Screen" — it behaves like an app.
For real remote use, deploy `web/` (Vercel/Netlify) and `server/` (Render/Fly),
or expose them with a tunnel.

## The three accounts (free tiers to start)

| Service | What it powers | Where |
| --- | --- | --- |
| **Tavus** | live video avatar | tavus.io → API Keys, and pick a stock **replica** |
| **ElevenLabs** | Chelsey's voice | elevenlabs.io → a feminine voice id |
| **Anthropic** | Chelsey's brain (Claude) | console.anthropic.com → API Keys |

Fill them into `server/.env`. To use Claude as her brain, Tavus must reach this
server: set `USE_CLAUDE=true` and `PUBLIC_URL` to an https tunnel (e.g. ngrok)
pointing at port 8787. Without that it falls back to Tavus's built-in LLM so you
can still test the video/voice immediately.

## Her personality
Lives in `persona/`. Edit `persona/system-prompt.md` to change how she talks,
then run `npm run reset-persona` in `server/` so Tavus rebuilds her.

## Status
- [x] Personality (deep, from the crew's Discord) — `persona/`
- [x] Web app (call screen, controls, setup checklist)
- [x] Backend (Tavus conversations, ElevenLabs voice, Claude brain proxy)
- [ ] Accounts + keys → go live
- [ ] Assistant tools (web search, music, look-swap)
- [ ] Phase 2: native app (Expo)
