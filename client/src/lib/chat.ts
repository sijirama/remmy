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

export async function sendMessage(message: string, history: ChatMessage[]): Promise<SendMessageResponse> {
  const res = await api.post('v1/chat', { message, history });
  return {
    response: res.data.response,
    search_context: res.data.search_context ?? undefined,
  };
}
