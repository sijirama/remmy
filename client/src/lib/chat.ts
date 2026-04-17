import api from './api';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const res = await api.get('v1/chat/history');
  return (res.data.messages ?? []).map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'model',
    content: m.content,
  }));
}

export async function sendMessage(message: string, history: ChatMessage[]): Promise<string> {
  const res = await api.post('v1/chat', { message, history });
  return res.data.response;
}
