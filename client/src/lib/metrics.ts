import api from './api';

export interface HeatmapDay {
  date: string;
  avg_mood: number;
  count: number;
}

export async function getHeatmapData(): Promise<HeatmapDay[]> {
  const res = await api.get('v1/metrics/heatmap');
  return res.data ?? [];
}
