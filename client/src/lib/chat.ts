import api from './api';

export interface ChatMessage {
  id?: number;
  role: 'user' | 'model';
  content: string;
}

export interface SearchResult {
  chunk_text: string;
  type: string;
  logged_at: string;
  similarity: number;
}

export interface SearchContext {
  query: string;
  results: SearchResult[];
}

export interface ChatHistoryPage {
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface SendMessageResponse {
  response: string;
  search_context?: SearchContext[];
}

export async function getChatHistory(beforeId?: number): Promise<ChatHistoryPage> {
  const params: Record<string, number> = {};
  if (beforeId !== undefined) params.before_id = beforeId;
  const res = await api.get('v1/chat/history', { params });
  return {
    messages: res.data.messages ?? [],
    hasMore: res.data.has_more ?? false,
  };
}

export async function sendMessage(message: string): Promise<SendMessageResponse> {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const clientDate = `${year}-${month}-${day}`;
  const clientDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d);

  const res = await api.post('v1/chat', { 
    message,
    client_date: clientDate,
    client_day: clientDay
  });
  return {
    response: res.data.response,
    search_context: res.data.search_context ?? undefined,
  };
}
