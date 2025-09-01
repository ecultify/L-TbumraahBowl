'use client';

import React from 'react';
import { TrendingUp, Target, Activity, Award } from 'lucide-react';

interface DetailedAnalysisResult {
  overallSimilarity: number;
  phaseComparison: {
    runUp: number;
    delivery: number;
    followThrough: number;
  };
  technicalMetrics: {
    armSwingSimilarity: number;
    bodyMovementSimilarity: number;
    rhythmSimilarity: number;
    releasePointAccuracy: number;
  };
  recommendations: string[];
}

interface AnalysisResultsProps {
  analysis: DetailedAnalysisResult | null;
  speedClass: 'Slow' | 'Fast' | 'Zooooom' | null;
}

export function AnalysisResults({ analysis, speedClass }: AnalysisResultsProps) {
  if (!analysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Needs Work';
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-800">Detailed Analysis</h3>
      </div>

      {/* Overall Score */}
      <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
        <div className="text-3xl font-bold text-gray-800 mb-2">
          {Math.round(analysis.overallSimilarity * 100)}%
        </div>
        <div className="text-sm text-gray-600">Overall Similarity to Benchmark</div>
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mt-2 ${getScoreColor(analysis.overallSimilarity)}`}>
          <Award className="w-4 h-4" />
          {getScoreLabel(analysis.overallSimilarity)}
        </div>
      </div>

      {/* Phase Comparison */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Bowling Phases
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">
              {Math.round(analysis.phaseComparison.runUp * 100)}%
            </div>
            <div className="text-xs text-gray-600">Run-up</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">
              {Math.round(analysis.phaseComparison.delivery * 100)}%
            </div>
            <div className="text-xs text-gray-600">Delivery</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">
              {Math.round(analysis.phaseComparison.followThrough * 100)}%
            </div>
            <div className="text-xs text-gray-600">Follow-through</div>
          </div>
        </div>
      </div>

      {/* Technical Metrics */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Technical Breakdown
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Arm Swing</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${analysis.technicalMetrics.armSwingSimilarity * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-800 w-10">
                {Math.round(analysis.technicalMetrics.armSwingSimilarity * 100)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Body Movement</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${analysis.technicalMetrics.bodyMovementSimilarity * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-800 w-10">
                {Math.round(analysis.technicalMetrics.bodyMovementSimilarity * 100)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Rhythm</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${analysis.technicalMetrics.rhythmSimilarity * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-800 w-10">
                {Math.round(analysis.technicalMetrics.rhythmSimilarity * 100)}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Release Point</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 transition-all duration-500"
                  style={{ width: `${analysis.technicalMetrics.releasePointAccuracy * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-800 w-10">
                {Math.round(analysis.technicalMetrics.releasePointAccuracy * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Recommendations</h4>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm text-blue-800">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}