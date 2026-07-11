import { create } from 'zustand';
import { getHealth, startConversation, endConversation, type Health } from './lib/api';
import { startCall, endCall, setMicMuted } from './lib/call';

export type Status = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

interface State {
  status: Status;
  error?: string;
  health?: Health;
  serverDown: boolean;
  stream: MediaStream | null;
  micMuted: boolean;
  conversationId?: string;
  init: () => Promise<void>;
  callChelsey: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMic: () => void;
}

export const useStore = create<State>((set, get) => ({
  status: 'idle',
  serverDown: false,
  stream: null,
  micMuted: false,

  async init() {
    try {
      const health = await getHealth();
      set({ health, serverDown: false });
    } catch {
      set({ serverDown: true });
    }
  },

  async callChelsey() {
    set({ status: 'connecting', error: undefined, stream: null });
    try {
      const convo = await startConversation();
      set({ conversationId: convo.conversationId });
      await startCall(convo.conversationUrl, {
        onStream: (stream) => set({ stream }),
        onStatus: (status, detail) => {
          if (status === 'live') set({ status: 'live' });
          else if (status === 'ended') set({ status: 'ended', stream: null });
          else if (status === 'error') set({ status: 'error', error: detail });
        },
      });
    } catch (e: any) {
      set({ status: 'error', error: e?.message || 'Could not reach Chelsey.' });
    }
  },

  async hangUp() {
    const id = get().conversationId;
    await endCall();
    if (id) endConversation(id);
    set({ status: 'idle', stream: null, conversationId: undefined, error: undefined });
  },

  toggleMic() {
    const micMuted = !get().micMuted;
    setMicMuted(micMuted);
    set({ micMuted });
  },
}));
