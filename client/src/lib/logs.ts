import api from './api';
import type { Log, UploadResponse } from './types';

export async function fetchLogs(date?: string): Promise<Log[]> {
  const res = await api.get('v1/logs', { params: date ? { date } : {} });
  return res.data.logs ?? [];
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
