export type FocusState = 'on_task' | 'off_task';

const WS_URL = 'ws://localhost:8000/ws';

export type FocusMessage = {
  state?: FocusState;
  summary?: string;
  task?: string;
  timestamp?: string;
  session_active?: boolean;
  error?: string;
};

type FocusSocketHandlers = {
  onStateChange?: (state: FocusState) => void;
  onMessage?: (payload: FocusMessage) => void;
};

export const createFocusSocket = (handlers: FocusSocketHandlers): (() => void) => {
  const socket = new WebSocket(WS_URL);

  socket.addEventListener('message', (event) => {
    try {
      const data: FocusMessage = JSON.parse(event.data);
      if (data.state === 'on_task' || data.state === 'off_task') {
        handlers.onStateChange?.(data.state);
      }
      if (handlers.onMessage) {
        handlers.onMessage(data);
      }
    } catch (error) {
      console.error('Failed to parse websocket message', error);
    }
  });

  socket.addEventListener('error', (error) => {
    console.error('WebSocket error', error);
  });

  return () => {
    socket.close();
  };
};
