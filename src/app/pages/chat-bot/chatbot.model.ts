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

export interface MedicalFormSuggestionRequest {
  symptoms: string;
  animalType?: string;
  age?: string;
  weight?: string;
  breed?: string;
  additionalInfo?: string;
}

export interface MedicalFormSuggestionResponse {
  suggestedDiagnosis: string;
  differentialDiagnoses: string[];
  recommendedTreatment: string;
  medications: string[];
  complementaryExams: string[];
  prognosis: string;
  ownerRecommendations: string[];
  success: boolean;
  errorMessage?: string;
}
