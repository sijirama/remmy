export interface Log {
  id: string;
  user_id: number;
  type: 'audio' | 'image';
  status: 'processing' | 'ready' | 'failed';
  raw_file_url: string;
  raw_transcript?: string;
  raw_description?: string;
  rewritten_content?: string;
  habit_matches: string[];
  logged_at: string;
  created_at: string;
}

export interface UploadResponse {
  id: string;
  type: string;
  status: string;
  created_at: string;
}
