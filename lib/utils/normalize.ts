export function normalizeIntensity(intensity: number, min: number, max: number): number {
  if (max === min) return intensity;
  return Math.max(0, Math.min(100, ((intensity - min) / (max - min)) * 100));
}

export function classifySpeed(similarity: number): { 
  speedClass: 'Slow' | 'Fast' | 'Zooooom'; 
  confidence: number;
  message: string;
} {
  let speedClass: 'Slow' | 'Fast' | 'Zooooom';
  let confidence: number;
  let message: string;

  console.log(`Classifying speed with similarity: ${similarity}%`);

  if (similarity < 60) {
    speedClass = 'Slow';
    confidence = Math.max(0.7, 1 - (similarity / 60) * 0.3);
    message = "Different bowling style detected. Focus on technique refinement to match benchmark.";
  } else if (similarity < 85) {
    speedClass = 'Fast';
    confidence = Math.max(0.8, 1 - Math.abs(similarity - 72.5) / 12.5 * 0.2);
    message = "Good bowling action! Moderate similarity to benchmark technique.";
  } else {
    speedClass = 'Zooooom';
    confidence = Math.max(0.9, 0.8 + ((similarity - 85) / 15) * 0.2);
    message = "Excellent! Outstanding technique match to benchmark bowling action!";
  }

  console.log(`Classification result: ${speedClass} (${confidence.toFixed(2)} confidence)`);

  return { speedClass, confidence, message };
}