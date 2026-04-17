import api from './api';

export interface ChatMessage {
  id?: number;
  role: 'user' | 'model';
  content: string;
}

export interface ChatHistoryPage {
  messages: ChatMessage[];
  hasMore: boolean;
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

export async function sendMessage(message: string, history: ChatMessage[]): Promise<string> {
  const res = await api.post('v1/chat', { message, history });
  return res.data.response;
}
