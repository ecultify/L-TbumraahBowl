export interface AnalysisData {
  intensity: number;
  similarity?: number;
  phases?: {
    runUp?: number;
    delivery?: number;
    followThrough?: number;
  };
  technicalMetrics?: {
    armSwing?: number;
    bodyMovement?: number;
    rhythm?: number;
    releasePoint?: number;
  };
  frameIntensities?: Array<{
    timestamp: number;
    intensity: number;
  }>;
  [key: string]: any;
}

const REDUCTION_PERCENT = 18;

export function applySimilarityReduction(data: AnalysisData): AnalysisData {
  const reductionFactor = 1 - (REDUCTION_PERCENT / 100);
  
  const originalSimilarity = data.similarity || data.intensity || 0;
  const reducedSimilarity = Math.max(0, Math.min(100, originalSimilarity - REDUCTION_PERCENT));
  
  const adjustedData = {
    ...data,
    intensity: reducedSimilarity,
    similarity: reducedSimilarity,
  };

  if (data.phases) {
    adjustedData.phases = {
      runUp: data.phases.runUp ? Math.max(0, Math.min(100, data.phases.runUp * reductionFactor)) : data.phases.runUp,
      delivery: data.phases.delivery ? Math.max(0, Math.min(100, data.phases.delivery * reductionFactor)) : data.phases.delivery,
      followThrough: data.phases.followThrough ? Math.max(0, Math.min(100, data.phases.followThrough * reductionFactor)) : data.phases.followThrough,
    };
  }

  if (data.technicalMetrics) {
    adjustedData.technicalMetrics = {
      armSwing: data.technicalMetrics.armSwing ? Math.max(0, Math.min(100, data.technicalMetrics.armSwing * reductionFactor)) : data.technicalMetrics.armSwing,
      bodyMovement: data.technicalMetrics.bodyMovement ? Math.max(0, Math.min(100, data.technicalMetrics.bodyMovement * reductionFactor)) : data.technicalMetrics.bodyMovement,
      rhythm: data.technicalMetrics.rhythm ? Math.max(0, Math.min(100, data.technicalMetrics.rhythm * reductionFactor)) : data.technicalMetrics.rhythm,
      releasePoint: data.technicalMetrics.releasePoint ? Math.max(0, Math.min(100, data.technicalMetrics.releasePoint * reductionFactor)) : data.technicalMetrics.releasePoint,
    };
  }

  // ✅ NEW: Adjust frameIntensities for graph animation
  if (data.frameIntensities && Array.isArray(data.frameIntensities)) {
    adjustedData.frameIntensities = data.frameIntensities.map(frame => ({
      timestamp: frame.timestamp,
      intensity: Math.max(0, Math.min(100, frame.intensity * reductionFactor))
    }));
  }

  return adjustedData;
}

