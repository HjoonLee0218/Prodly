export type FocusState = 'on_task' | 'off_task';

const WS_URL = 'ws://localhost:8000/ws';

type MessagePayload = {
  state?: FocusState;
};

export const createFocusSocket = (
  onStateChange: (state: FocusState) => void,
): (() => void) => {
  const socket = new WebSocket(WS_URL);

  socket.addEventListener('message', (event) => {
    try {
      const data: MessagePayload = JSON.parse(event.data);
      if (data.state === 'on_task' || data.state === 'off_task') {
        onStateChange(data.state);
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
