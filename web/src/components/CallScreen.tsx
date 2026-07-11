import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import SetupPanel from './SetupPanel';

export default function CallScreen() {
  const { status, error, health, serverDown, stream, micMuted, callChelsey, hangUp, toggleMic } =
    useStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [stream]);

  const ready = !!health?.ready && !serverDown;
  const inCall = status === 'connecting' || status === 'live';

  // ── Live / connecting: full-bleed Chelsey ────────────────────────────────
  if (inCall) {
    return (
      <div className="relative h-full w-full bg-ink-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />

        {/* connecting overlay */}
        {status === 'connecting' && (
          <div className="absolute inset-0 grid place-items-center bg-ink-900/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <Halo pulsing />
              <p className="text-sm text-blush-200">waking Chelsey up…</p>
            </div>
          </div>
        )}

        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/60 to-transparent p-5">
          <span className="text-lg font-semibold tracking-wide">Chelsey</span>
          {status === 'live' && (
            <span className="flex items-center gap-1.5 text-xs text-blush-200">
              <span className="h-2 w-2 animate-breathe rounded-full bg-blush-400" />
              live
            </span>
          )}
        </div>

        {/* controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 bg-gradient-to-t from-black/70 to-transparent p-8 pb-10">
          <button
            onClick={toggleMic}
            className={`grid h-14 w-14 place-items-center rounded-full text-xl backdrop-blur transition ${
              micMuted ? 'bg-white/15 text-white/50' : 'bg-white/20 text-white'
            }`}
            aria-label={micMuted ? 'Unmute' : 'Mute'}
          >
            {micMuted ? '🔇' : '🎙️'}
          </button>
          <button
            onClick={hangUp}
            className="grid h-16 w-16 place-items-center rounded-full bg-red-500 text-2xl shadow-lg shadow-red-500/30 transition active:scale-95"
            aria-label="End call"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // ── Idle / error: her home screen ────────────────────────────────────────
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto px-6 py-12">
      {/* warm ambient glow */}
      <div
        className="pointer-events-none absolute -top-1/4 h-[70vh] w-[70vh] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #e94f92 0%, transparent 60%)' }}
      />

      <div className="z-10 flex flex-col items-center text-center">
        <Halo />
        <h1 className="mt-6 text-3xl font-semibold tracking-wide">Chelsey</h1>
        <p className="mt-1 text-sm text-blush-200/80">
          {ready ? "ACE's Girl · online" : 'almost ready'}
        </p>

        {status === 'error' && (
          <p className="mt-4 max-w-xs text-sm text-red-300">{error}</p>
        )}
        {status === 'ended' && (
          <p className="mt-4 text-sm text-white/50">call ended — she&apos;s here when you want her</p>
        )}

        {ready ? (
          <>
            <button
              onClick={callChelsey}
              className="mt-9 flex items-center gap-3 rounded-full bg-blush-400 px-9 py-4 text-lg font-semibold text-ink-900 shadow-lg shadow-blush-500/30 transition active:scale-95"
            >
              <span className="text-xl">📞</span>
              Call Chelsey
            </button>
            <p className="mt-4 text-xs text-white/40">she&apos;s been waiting up for you</p>
          </>
        ) : (
          <SetupPanel health={health} serverDown={serverDown} />
        )}
      </div>
    </div>
  );
}

// The soft breathing orb that stands in for Chelsey before/while she connects.
function Halo({ pulsing = false }: { pulsing?: boolean }) {
  return (
    <div className={`relative grid h-32 w-32 place-items-center ${pulsing ? 'animate-breathe' : ''}`}>
      <div
        className="absolute inset-0 rounded-full opacity-70 blur-xl"
        style={{ background: 'radial-gradient(circle, #ff9ec6 0%, #e94f92 55%, transparent 75%)' }}
      />
      <div className="relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-blush-300 to-blush-500 text-4xl font-semibold text-ink-900 shadow-2xl">
        C
      </div>
    </div>
  );
}
