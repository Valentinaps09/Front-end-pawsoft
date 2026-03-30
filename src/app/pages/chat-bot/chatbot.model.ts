export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  history: { role: string; text: string }[];
}

export interface ChatResponse {
  reply: string;
  success: boolean;
}
