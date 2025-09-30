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
    <div style={{ width: '794px', height: '1123px', backgroundColor: 'white', color: '#1f2937', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ width: '100%', padding: '24px 32px', background: `linear-gradient(90deg, ${appBlue}, ${appGreen})` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '32px' }}>
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', lineHeight: '32px', margin: 0 }}>Bowling Analysis Report</h1>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: '32px' }}>{currentDate || 'Loading...'}</div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Summary Grid - Using Table Layout for PDF Stability */}
        <div style={{ marginBottom: '48px' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '8px' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', verticalAlign: 'top' }}>
                  <div style={{ display: 'block', color: '#6b7280', fontSize: '14px', lineHeight: '20px', marginBottom: '8px', whiteSpace: 'nowrap' }}>
                    Predicted Speed
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 'bold', lineHeight: '36px', color: appBlue }}>{kmh.toFixed(2)} km/h</div>
                </td>
                <td style={{ width: '50%', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', verticalAlign: 'top' }}>
                  <div style={{ display: 'block', color: '#6b7280', fontSize: '14px', lineHeight: '20px', marginBottom: '8px', whiteSpace: 'nowrap' }}>
                    Similarity
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 'bold', lineHeight: '36px', color: appBlue }}>{similarityPercent.toFixed(1)}%</div>
                </td>
              </tr>
              <tr>
                <td style={{ width: '50%', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', verticalAlign: 'top' }}>
                  <div style={{ display: 'block', color: '#6b7280', fontSize: '14px', lineHeight: '20px', marginBottom: '8px', whiteSpace: 'nowrap' }}>
                    Speed Class
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', lineHeight: '32px', color: appGreen }}>{speedClass ?? '—'}</div>
                </td>
                <td style={{ width: '50%', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', verticalAlign: 'top' }}>
                  <div style={{ display: 'block', color: '#6b7280', fontSize: '14px', lineHeight: '20px', marginBottom: '8px', whiteSpace: 'nowrap' }}>
                    Confidence
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 'bold', lineHeight: '36px', color: appGreen }}>{confidencePercent}%</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Phase Comparison */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', lineHeight: '28px', marginBottom: '12px' }}>Phase Comparison</h2>
          <div style={{ display: 'block' }}>
            {[
              { label: 'Run-up', val: runUp },
              { label: 'Delivery', val: delivery },
              { label: 'Follow-through', val: followThrough },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px', marginBottom: '4px' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                  <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{item.val}%</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden', width: '100%' }}>
                  <div style={{ height: '100%', borderRadius: '9999px', width: `${item.val}%`, background: appBlue }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Metrics */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', lineHeight: '28px', marginBottom: '12px' }}>Technical Metrics</h2>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '8px' }}>
            <tbody>
              <tr>
                {[
                  { label: 'Arm Swing Similarity', val: arm },
                  { label: 'Body Movement Similarity', val: body },
                ].map((item) => (
                  <td key={item.label} style={{ width: '50%', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px', marginBottom: '8px' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                      <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{item.val}%</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden', width: '100%' }}>
                      <div style={{ height: '100%', borderRadius: '9999px', width: `${item.val}%`, background: appGreen }} />
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                {[
                  { label: 'Rhythm Similarity', val: rhythm },
                  { label: 'Release Point Accuracy', val: release },
                ].map((item) => (
                  <td key={item.label} style={{ width: '50%', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', lineHeight: '20px', marginBottom: '8px' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                      <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{item.val}%</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden', width: '100%' }}>
                      <div style={{ height: '100%', borderRadius: '9999px', width: `${item.val}%`, background: appGreen }} />
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Recommendations */}
        {details?.recommendations && details.recommendations.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', lineHeight: '28px', marginBottom: '12px' }}>Recommendations</h2>
            <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
              <ul style={{ listStyleType: 'disc', listStylePosition: 'inside', fontSize: '14px', lineHeight: '20px', margin: 0, padding: 0 }}>
                {details.recommendations.map((r, i) => (
                  <li key={i} style={{ marginBottom: i < details.recommendations!.length - 1 ? '4px' : 0 }}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
