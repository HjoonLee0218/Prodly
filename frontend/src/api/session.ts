const API_BASE_URL = 'http://127.0.0.1:8000';

export type SessionInfo = {
  task_description: string;
  ends_at: string;
  seconds_remaining: number;
  last_summary?: string | null;
  last_state?: 'on_task' | 'off_task' | null;
  session_active: boolean;
};

type SessionRequest = {
  task_description: string;
  duration_minutes: number;
};

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  let detail: string | undefined;
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') {
      detail = body.detail;
    }
  } catch {
    // ignore parse errors
  }
  throw new Error(detail ?? 'Request failed');
}

export async function startSession(request: SessionRequest): Promise<SessionInfo> {
  const response = await fetch(`${API_BASE_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleJsonResponse<SessionInfo>(response);
}

export async function endSession(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/session`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 404) {
    await handleJsonResponse(response);
  }
}

export async function getSession(): Promise<SessionInfo | null> {
  const response = await fetch(`${API_BASE_URL}/session`);
  if (response.status === 404) {
    return null;
  }
  return handleJsonResponse<SessionInfo>(response);
}
