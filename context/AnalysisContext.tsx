'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export type SpeedClass = 'Slow' | 'Fast' | 'Zooooom';
export type AnalyzerMode = 'pose' | 'benchmark';

export interface FrameIntensity {
  timestamp: number;
  intensity: number;
}

export interface AnalysisState {
  isAnalyzing: boolean;
  currentVideo: string | null;
  frameIntensities: FrameIntensity[];
  finalIntensity: number;
  speedClass: SpeedClass | null;
  confidence: number;
  analyzerMode: AnalyzerMode;
  progress: number;
}

type AnalysisAction =
  | { type: 'SET_VIDEO'; payload: string }
  | { type: 'START_ANALYSIS' }
  | { type: 'UPDATE_PROGRESS'; payload: number }
  | { type: 'ADD_FRAME_INTENSITY'; payload: FrameIntensity }
  | { type: 'COMPLETE_ANALYSIS'; payload: { finalIntensity: number; speedClass: SpeedClass; confidence: number } }
  | { type: 'RESET_ANALYSIS' }
  | { type: 'SET_ANALYZER_MODE'; payload: AnalyzerMode };

const initialState: AnalysisState = {
  isAnalyzing: false,
  currentVideo: null,
  frameIntensities: [],
  finalIntensity: 0,
  speedClass: null,
  confidence: 0,
  analyzerMode: 'benchmark',
  progress: 0,
};

function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'SET_VIDEO':
      return { ...state, currentVideo: action.payload };
    case 'START_ANALYSIS':
      return { 
        ...state, 
        isAnalyzing: true, 
        frameIntensities: [], 
        finalIntensity: 0, 
        speedClass: null, 
        confidence: 0,
        progress: 0 
      };
    case 'UPDATE_PROGRESS':
      return { ...state, progress: action.payload };
    case 'ADD_FRAME_INTENSITY':
      return { 
        ...state, 
        frameIntensities: [...state.frameIntensities, action.payload] 
      };
    case 'COMPLETE_ANALYSIS':
      return { 
        ...state, 
        isAnalyzing: false, 
        finalIntensity: action.payload.finalIntensity,
        speedClass: action.payload.speedClass,
        confidence: action.payload.confidence,
        progress: 100
      };
    case 'RESET_ANALYSIS':
      return { 
        ...state, 
        isAnalyzing: false, 
        frameIntensities: [], 
        finalIntensity: 0, 
        speedClass: null, 
        confidence: 0,
        progress: 0,
        currentVideo: null 
      };
    case 'SET_ANALYZER_MODE':
      return { ...state, analyzerMode: action.payload };
    default:
      return state;
  }
}

const AnalysisContext = createContext<{
  state: AnalysisState;
  dispatch: React.Dispatch<AnalysisAction>;
} | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);

  return (
    <AnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}