export enum AppMode {
  ANALYSIS = 'ANALYSIS',
  VEO_VIDEO = 'VEO_VIDEO',
  IMAGE_EDIT = 'IMAGE_EDIT',
  LIVE_AGENT = 'LIVE_AGENT'
}

export interface AnalysisData {
  text: string;
  groundingChunks?: Array<{
    web?: { uri: string; title: string };
  }>;
  priceData?: Array<{ name: string; price: number }>;
  keywords?: string[]; // New: Extracted Thai keywords
}

export interface VideoGenerationState {
  isLoading: boolean;
  videoUri: string | null;
  error: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Helper types for AI Studio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}