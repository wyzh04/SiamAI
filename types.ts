export enum AppMode {
  ANALYSIS = 'ANALYSIS',
  LIVE_AGENT = 'LIVE_AGENT',
  HERO_DESIGN = 'HERO_DESIGN',
  IMAGE_EDIT = 'IMAGE_EDIT',
  VEO_VIDEO = 'VEO_VIDEO',
  CALCULATOR = 'CALCULATOR'
}

export type TargetMarket = 'TH' | 'PH' | 'VN' | 'MY' | 'SG' | 'ID';

export interface AnalysisData {
  text: string;
  groundingChunks?: Array<{
    web?: { uri: string; title: string };
  }>;
  priceData?: Array<{ name: string; price: number }>;
  keywords?: string[]; 
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

export interface User {
  id: string;
  name: string;
  avatar: string;
  type: 'wechat' | 'phone';
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  mode: AppMode;
  title: string;
  thumbnail?: string; // Base64 string for preview
  data: any; // Store analysis result or video URL
  market?: TargetMarket; // Track which market this history item belongs to
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