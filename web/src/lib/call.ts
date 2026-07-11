// Wraps the Daily call object. A Tavus conversation URL is a Daily room; Chelsey
// (the replica) is the remote participant. We publish the mic (no camera) and
// surface her video+audio as a single MediaStream for the UI to render.
import Daily from '@daily-co/daily-js';

type CallStatus = 'connecting' | 'live' | 'ended' | 'error';

export interface CallEvents {
  onStream: (stream: MediaStream | null) => void;
  onStatus: (status: CallStatus, detail?: string) => void;
}

let call: any = null;

function remoteStream(c: any): MediaStream | null {
  const participants = c.participants();
  const remote = Object.values(participants).find((p: any) => !p.local) as any;
  if (!remote) return null;

  const stream = new MediaStream();
  const v = remote.tracks?.video;
  const a = remote.tracks?.audio;
  if (v?.persistentTrack && v.state !== 'off') stream.addTrack(v.persistentTrack);
  if (a?.persistentTrack && a.state !== 'off') stream.addTrack(a.persistentTrack);
  return stream.getTracks().length ? stream : null;
}

export async function startCall(url: string, ev: CallEvents): Promise<void> {
  await endCall();

  call = Daily.createCallObject({ audioSource: true, videoSource: false });

  const refresh = () => ev.onStream(remoteStream(call));

  call
    .on('joined-meeting', () => ev.onStatus('live'))
    .on('participant-joined', refresh)
    .on('participant-updated', refresh)
    .on('track-started', refresh)
    .on('track-stopped', refresh)
    .on('participant-left', refresh)
    .on('left-meeting', () => ev.onStatus('ended'))
    .on('error', (e: any) => ev.onStatus('error', e?.errorMsg || 'connection error'));

  ev.onStatus('connecting');
  await call.join({ url });
}

export async function endCall(): Promise<void> {
  if (!call) return;
  try {
    await call.leave();
  } catch {
    /* ignore */
  }
  try {
    call.destroy();
  } catch {
    /* ignore */
  }
  call = null;
}

export function setMicMuted(muted: boolean): void {
  call?.setLocalAudio(!muted);
}
