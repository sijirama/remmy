import api from './api';
import type { Log, UploadResponse } from './types';

export interface LogsPage {
  logs: Log[];
  hasMore: boolean;
}

export async function fetchLogs(date?: string, offset = 0): Promise<LogsPage> {
  const params: Record<string, string | number> = { offset };
  if (date) params.date = date;
  const res = await api.get('v1/logs', { params });
  return {
    logs: res.data.logs ?? [],
    hasMore: res.data.has_more ?? false,
  };
}

export async function fetchLog(id: string): Promise<Log> {
  const res = await api.get(`v1/logs/${id}`);
  return res.data;
}

export async function uploadAudioLog(blob: Blob): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', blob, 'audio.webm');
  const res = await api.post('v1/logs/audio', form);
  return res.data;
}

export async function uploadImageLog(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('v1/logs/image', form);
  return res.data;
}
