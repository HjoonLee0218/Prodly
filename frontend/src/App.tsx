import { FormEvent, useEffect, useState } from 'react';

import { createFocusSocket, FocusState } from './api/socket';
import { FocusBanner } from './components/FocusBanner';

const INITIAL_STATE: FocusState = 'on_task';

function App() {
  const [focusState, setFocusState] = useState<FocusState>(INITIAL_STATE);
  const [taskInput, setTaskInput] = useState('');
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [durationInput, setDurationInput] = useState('25');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    const closeSocket = createFocusSocket(setFocusState);
    return () => {
      closeSocket();
    };
  }, []);

  useEffect(() => {
    if (!timerRunning || timeRemaining === null) {
      return;
    }

    if (timeRemaining <= 0) {
      setTimerRunning(false);
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) {
          return prev;
        }
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [timerRunning, timeRemaining]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds < 0) {
      return '--:--';
    }
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const durationMinutes = Number(durationInput);
    if (!taskInput.trim() || Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      return;
    }
    setCurrentTask(taskInput.trim());
    setTimeRemaining(durationMinutes * 60);
    setTimerRunning(true);
  };

  const resetSession = () => {
    setTimerRunning(false);
    setTimeRemaining(null);
  };

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
        <section className="w-full rounded-lg border border-slate-800 bg-slate-900/70 p-6 text-left">
          <h2 className="text-xl font-semibold text-slate-100">Session planner</h2>
          <p className="mt-1 text-sm text-slate-400">Tell FocusAgent what you&apos;re working on and how long you plan to stay locked in.</p>
          <form className="mt-4 flex flex-col gap-4" onSubmit={startSession}>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
              Task
              <input
                type="text"
                value={taskInput}
                onChange={(event) => setTaskInput(event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-base text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="Rewrite onboarding flow..."
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
              Duration (minutes)
              <input
                type="number"
                min={1}
                value={durationInput}
                onChange={(event) => setDurationInput(event.target.value)}
                className="w-32 rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-base text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800 disabled:text-emerald-200"
                disabled={!taskInput.trim() || Number(durationInput) <= 0}
              >
                Start session
              </button>
              <button
                type="button"
                onClick={resetSession}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:text-slate-50"
              >
                Reset
              </button>
            </div>
          </form>
          <div className="mt-6 rounded-md border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm uppercase tracking-wide text-slate-400">Current task</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {currentTask ?? 'No task selected'}
            </p>
            <p className="mt-4 text-sm uppercase tracking-wide text-slate-400">Timer</p>
            <p className="mt-1 text-3xl font-bold text-slate-50">{formatTime(timeRemaining)}</p>
            {timerRunning ? (
              <p className="mt-2 text-sm text-emerald-400">Focus mode is running</p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                {timeRemaining === 0
                  ? 'Session complete!'
                  : 'Start a session to begin the countdown.'}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
