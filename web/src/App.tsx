import { useEffect } from 'react';
import { useStore } from './store';
import CallScreen from './components/CallScreen';

export default function App() {
  const init = useStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-900 font-sans">
      <CallScreen />
    </div>
  );
}
