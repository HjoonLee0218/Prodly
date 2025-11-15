import { useEffect, useState } from 'react';

type FocusBannerProps = {
  state: 'on_task' | 'off_task';
  durationMs?: number;
};

const HIDE_DELAY_MS = 3000;

export function FocusBanner({ state, durationMs = HIDE_DELAY_MS }: FocusBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state === 'off_task') {
      setVisible(true);
      const timeout = window.setTimeout(() => {
        setVisible(false);
      }, durationMs);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    setVisible(false);
    return undefined;
  }, [state, durationMs]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-6 flex justify-center">
      <div className="rounded bg-red-600 px-4 py-2 text-white shadow-lg">
        <span className="mr-2">⚠️</span>
        You seem off-task
      </div>
    </div>
  );
}
