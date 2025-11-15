import { useEffect, useState } from 'react';

import { createFocusSocket, FocusState } from './api/socket';
import { FocusBanner } from './components/FocusBanner';

const INITIAL_STATE: FocusState = 'on_task';

function App() {
  const [focusState, setFocusState] = useState<FocusState>(INITIAL_STATE);

  useEffect(() => {
    const closeSocket = createFocusSocket(setFocusState);
    return () => {
      closeSocket();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <FocusBanner state={focusState} />

      <main className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-4 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">FocusAgent</h1>
        <p className="text-lg text-slate-300">
          Keep your attention on the task at hand. Stay tuned for real-time focus updates streamed
          from the agent.
        </p>
        <section className="rounded-lg border border-slate-700 bg-slate-900 px-6 py-4">
          <h2 className="text-xl font-medium text-slate-100">Current state</h2>
          <p
            className={
              focusState === 'on_task'
                ? 'mt-2 text-emerald-400'
                : 'mt-2 text-red-400'
            }
          >
            {focusState === 'on_task' ? 'On task' : 'Off task'}
          </p>
        </section>
        <p className="text-sm text-slate-500">
          The banner appears automatically when the agent detects you&apos;re off task.
        </p>
      </main>
    </div>
  );
}

export default App;
