import type { Health } from '../lib/api';

// Friendly checklist shown until the accounts/keys are in place. It turns the
// "not configured yet" moment into a clear to-do instead of a dead end.
export default function SetupPanel({ health, serverDown }: { health?: Health; serverDown: boolean }) {
  const steps = [
    { key: 'TAVUS_API_KEY', label: 'Tavus API key', note: 'her live video face' },
    { key: 'TAVUS_REPLICA_ID', label: 'Tavus replica', note: 'the look she wears' },
    { key: 'ELEVENLABS', label: 'ElevenLabs voice', note: 'her voice' },
    { key: 'ANTHROPIC_API_KEY', label: 'Anthropic (Claude)', note: 'her brain' },
    { key: 'PUBLIC_URL', label: 'Public URL', note: 'so Claude can reach her' },
  ];

  const missing = health?.missing || [];
  const isDone = (k: string) => !missing.some((m) => m.startsWith(k) || m.startsWith(k.split('_')[0]));

  return (
    <div className="mt-8 w-full max-w-sm animate-rise rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <p className="text-sm font-medium text-blush-200">
        {serverDown ? 'Start the server to wake her up' : 'A few things left before she can talk'}
      </p>

      {serverDown ? (
        <p className="mt-2 text-xs leading-relaxed text-white/60">
          The backend isn&apos;t running. In the <code className="text-blush-300">server</code> folder run{' '}
          <code className="text-blush-300">npm run dev</code>, then refresh.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {steps.map((s) => {
            const done = isDone(s.key);
            return (
              <li key={s.key} className="flex items-center gap-3 text-sm">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${
                    done ? 'bg-blush-400 text-ink-900' : 'border border-white/25 text-white/30'
                  }`}
                >
                  {done ? '✓' : ''}
                </span>
                <span className={done ? 'text-white/80' : 'text-white/60'}>
                  {s.label} <span className="text-white/35">— {s.note}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
