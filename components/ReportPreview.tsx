'use client';

import React, { useState, useEffect } from 'react';
import { Gauge, Award, Zap, TrendingUp, Clock, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ReportPreviewProps {
  kmh: number;
  similarityPercent: number; // 0-100
  speedClass: string | null;
  confidencePercent: number; // 0-100
  details?: {
    phaseComparison?: { runUp: number; delivery: number; followThrough: number };
    technicalMetrics?: {
      armSwingSimilarity: number;
      bodyMovementSimilarity: number;
      rhythmSimilarity: number;
      releasePointAccuracy: number;
    };
    recommendations?: string[];
  } | null;
}

export default function ReportPreview({ kmh, similarityPercent, speedClass, confidencePercent, details }: ReportPreviewProps) {
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    // Use a consistent format to avoid hydration issues
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    setCurrentDate(formatted);
  }, []);

  const runUp = Math.round((details?.phaseComparison?.runUp ?? 0) * 100);
  const delivery = Math.round((details?.phaseComparison?.delivery ?? 0) * 100);
  const followThrough = Math.round((details?.phaseComparison?.followThrough ?? 0) * 100);
  const arm = Math.round((details?.technicalMetrics?.armSwingSimilarity ?? 0) * 100);
  const body = Math.round((details?.technicalMetrics?.bodyMovementSimilarity ?? 0) * 100);
  const rhythm = Math.round((details?.technicalMetrics?.rhythmSimilarity ?? 0) * 100);
  const release = Math.round((details?.technicalMetrics?.releasePointAccuracy ?? 0) * 100);

  const appBlue = '#2563EB'; // tailwind blue-600
  const appGreen = '#16A34A'; // tailwind green-600

  return (
    <div className="w-[794px] h-[1123px] bg-white text-gray-800">
      {/* Header */}
      <div className="w-full px-8 py-6" style={{ background: `linear-gradient(90deg, ${appBlue}, ${appGreen})` }}>
        <div className="flex items-center justify-between">
          <h1 className="text-white text-2xl font-bold">Bowling Analysis Report</h1>
          <div className="text-white/90 text-sm">{currentDate || 'Loading...'}</div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-12">
        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm leading-none">
              <Gauge className="w-4 h-4 shrink-0 -mt-0.5" />
              <span>Predicted Speed</span>
            </div>
            <div className="text-3xl font-bold mt-2" style={{ color: appBlue }}>{kmh.toFixed(2)} km/h</div>
          </Card>
          <Card className="p-4">
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm leading-none">
              <TrendingUp className="w-4 h-4 shrink-0 -mt-0.5" />
              <span>Similarity</span>
            </div>
            <div className="text-3xl font-bold mt-2" style={{ color: appBlue }}>{similarityPercent.toFixed(1)}%</div>
          </Card>
          <Card className="p-4">
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm leading-none">
              <Award className="w-4 h-4 shrink-0 -mt-0.5" />
              <span>Speed Class</span>
            </div>
            <div className="text-2xl font-semibold mt-2" style={{ color: appGreen }}>{speedClass ?? '—'}</div>
          </Card>
          <Card className="p-4">
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm leading-none">
              <Zap className="w-4 h-4 shrink-0 -mt-0.5" />
              <span>Confidence</span>
            </div>
            <div className="text-3xl font-bold mt-2" style={{ color: appGreen }}>{confidencePercent}%</div>
          </Card>
        </div>

        {/* Phase Comparison */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Phase Comparison</h2>
          <div className="space-y-3">
            {[
              { label: 'Run-up', val: runUp },
              { label: 'Delivery', val: delivery },
              { label: 'Follow-through', val: followThrough },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1"><span>{item.label}</span><span>{item.val}%</span></div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.val}%`, background: appBlue }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Metrics */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Technical Metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Arm Swing Similarity', val: arm },
              { label: 'Body Movement Similarity', val: body },
              { label: 'Rhythm Similarity', val: rhythm },
              { label: 'Release Point Accuracy', val: release },
            ].map((item) => (
              <Card key={item.label} className="p-4">
                <div className="flex justify-between text-sm mb-2"><span>{item.label}</span><span>{item.val}%</span></div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.val}%`, background: appGreen }} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {details?.recommendations && details.recommendations.length > 0 && (
          <div>
            <div className="inline-flex items-center gap-2 mb-3 leading-none">
              <Target className="w-5 h-5 shrink-0 -mt-0.5" />
              <h2 className="text-lg font-semibold">Recommendations</h2>
            </div>
            <Card className="p-4">
              <ul className="list-disc list-inside text-sm space-y-1">
                {details.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
