import api from './api';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function sendMessage(message: string, history: ChatMessage[]): Promise<string> {
  const res = await api.post('v1/chat', { message, history });
  return res.data.response;
}
