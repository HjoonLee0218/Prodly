const API_BASE_URL = 'http://127.0.0.1:8000';

export type AnalyzeResponse = {
  summary: string;
  state: 'on_task' | 'off_task';
};

export const analyzeScreen = async (taskDescription: string): Promise<AnalyzeResponse> => {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task_description: taskDescription }),
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') {
        detail = body.detail;
      }
    } catch {
      // ignore json parsing errors, we'll throw default message
    }
    throw new Error(detail ?? 'Failed to analyze the screen');
  }

  return response.json() as Promise<AnalyzeResponse>;
};
