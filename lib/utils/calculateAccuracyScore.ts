/**
 * Calculate overall accuracy score from phase and technical metrics
 * This matches how composite cards calculate the overall accuracy
 */
export function calculateAccuracyScore(
  phases: {
    runUp: number;
    delivery: number;
    followThrough: number;
  },
  technicalMetrics: {
    rhythm: number;
    armSwing: number;
    bodyMovement: number;
    releasePoint: number;
  }
): number {
  // Weight distribution (same as composite card logic)
  const phaseWeight = 0.5; // 50% weight to phases
  const technicalWeight = 0.5; // 50% weight to technical metrics

  // Calculate average phase score
  const phaseAverage = (
    phases.runUp +
    phases.delivery +
    phases.followThrough
  ) / 3;

  // Calculate average technical score
  const technicalAverage = (
    technicalMetrics.rhythm +
    technicalMetrics.armSwing +
    technicalMetrics.bodyMovement +
    technicalMetrics.releasePoint
  ) / 4;

  // Calculate weighted overall accuracy
  const overallAccuracy = (
    phaseAverage * phaseWeight +
    technicalAverage * technicalWeight
  );

  // Round to 2 decimal places
  return Math.round(overallAccuracy * 100) / 100;
}

/**
 * Extract accuracy score from meta field or calculate it
 */
export function getAccuracyScore(meta: any): number | null {
  try {
    // If meta has phases and technical metrics, calculate
    if (meta?.phases && meta?.technicalMetrics) {
      return calculateAccuracyScore(meta.phases, meta.technicalMetrics);
    }
    
    // If meta has accuracy_score directly
    if (typeof meta?.accuracy_score === 'number') {
      return meta.accuracy_score;
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating accuracy score:', error);
    return null;
  }
}

