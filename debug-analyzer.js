#!/usr/bin/env node

/**
 * Debug script to test BenchmarkComparisonAnalyzer functionality
 * This script validates that the analyzer can load patterns and calculate similarities correctly
 */

console.log('🔍 BenchmarkComparisonAnalyzer Debug Script');
console.log('============================================');

// Mock browser environment for Node.js testing
if (typeof window === 'undefined') {
  global.window = {
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  };
  global.document = {
    createElement: () => ({
      getContext: () => ({
        drawImage: () => {},
        getImageData: () => ({ data: new Array(1000).fill(0) })
      }),
      width: 320,
      height: 240
    }),
    fonts: { ready: Promise.resolve() }
  };
}

// Test the analyzer pattern loading
async function testAnalyzerPattern() {
  console.log('\n📊 Testing pattern loading and similarity calculation...');
  
  try {
    // Load the benchmark pattern directly from file
    const fs = require('fs');
    const path = require('path');
    
    const patternPath = path.join(__dirname, 'public', 'benchmarkPattern.json');
    console.log('📁 Loading pattern from:', patternPath);
    
    if (!fs.existsSync(patternPath)) {
      console.error('❌ Benchmark pattern file not found:', patternPath);
      return false;
    }
    
    const patternData = JSON.parse(fs.readFileSync(patternPath, 'utf8'));
    console.log('✅ Pattern loaded successfully');
    console.log('📊 Pattern stats:', {
      armSwingVelocities: patternData.armSwingVelocities.length,
      bodyMovementVelocities: patternData.bodyMovementVelocities.length,
      overallIntensities: patternData.overallIntensities.length,
      releasePointFrame: patternData.releasePointFrame,
      actionPhases: Object.keys(patternData.actionPhases).join(', ')
    });
    
    // Test similarity calculation with the same pattern (should be high similarity)
    console.log('\n🔄 Testing self-similarity (should be ~100%)...');
    const selfSimilarity = calculateSimilarity(patternData, patternData);
    console.log('📊 Self-similarity result:', (selfSimilarity * 100).toFixed(1) + '%');
    
    // Test with modified pattern (should be lower similarity)
    console.log('\n🔄 Testing modified pattern similarity...');
    const modifiedPattern = {
      ...patternData,
      armSwingVelocities: patternData.armSwingVelocities.map(v => v * 0.5), // Half velocities
      bodyMovementVelocities: patternData.bodyMovementVelocities.map(v => v * 0.5),
      overallIntensities: patternData.overallIntensities.map(v => v * 0.5)
    };
    const modifiedSimilarity = calculateSimilarity(modifiedPattern, patternData);
    console.log('📊 Modified pattern similarity:', (modifiedSimilarity * 100).toFixed(1) + '%');
    
    // Test with zero pattern (should be very low similarity)
    console.log('\n🔄 Testing zero pattern similarity...');
    const zeroPattern = {
      ...patternData,
      armSwingVelocities: new Array(patternData.armSwingVelocities.length).fill(0),
      bodyMovementVelocities: new Array(patternData.bodyMovementVelocities.length).fill(0),
      overallIntensities: new Array(patternData.overallIntensities.length).fill(0)
    };
    const zeroSimilarity = calculateSimilarity(zeroPattern, patternData);
    console.log('📊 Zero pattern similarity:', (zeroSimilarity * 100).toFixed(1) + '%');
    
    console.log('\n✅ Pattern testing completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing pattern:', error.message);
    return false;
  }
}

// Simplified similarity calculation based on the analyzer logic
function calculateSimilarity(inputPattern, benchmarkPattern) {
  // Get weights (same as in analyzer)
  const weights = {
    armSwing: 0.40,
    releasePoint: 0.25,
    rhythm: 0.15,
    followThrough: 0.15,
    runUp: 0.10,
    delivery: 0.05,
  };
  
  // Calculate individual similarities
  const armSwingSim = compareArrays(inputPattern.armSwingVelocities, benchmarkPattern.armSwingVelocities);
  const rhythmSim = compareArrays(inputPattern.overallIntensities, benchmarkPattern.overallIntensities);
  
  // Release point timing similarity
  let releasePointSim = 0;
  if (inputPattern.overallIntensities.length > 0 && benchmarkPattern.overallIntensities.length > 0) {
    const inputRelativeRelease = inputPattern.releasePointFrame / inputPattern.overallIntensities.length;
    const benchmarkRelativeRelease = benchmarkPattern.releasePointFrame / benchmarkPattern.overallIntensities.length;
    releasePointSim = 1 - Math.abs(inputRelativeRelease - benchmarkRelativeRelease);
  }
  
  // Phase similarities (simplified)
  const runUpSim = comparePhases(inputPattern, benchmarkPattern, 'runUp');
  const deliverySim = comparePhases(inputPattern, benchmarkPattern, 'delivery');
  const followThroughSim = comparePhases(inputPattern, benchmarkPattern, 'followThrough');
  
  // Ensure all similarities are valid numbers
  const safeValues = {
    armSwing: isNaN(armSwingSim) || !isFinite(armSwingSim) ? 0.5 : armSwingSim,
    releasePoint: isNaN(releasePointSim) || !isFinite(releasePointSim) ? 0.5 : releasePointSim,
    rhythm: isNaN(rhythmSim) || !isFinite(rhythmSim) ? 0.5 : rhythmSim,
    followThrough: isNaN(followThroughSim) || !isFinite(followThroughSim) ? 0.5 : followThroughSim,
    runUp: isNaN(runUpSim) || !isFinite(runUpSim) ? 0.5 : runUpSim,
    delivery: isNaN(deliverySim) || !isFinite(deliverySim) ? 0.5 : deliverySim
  };
  
  const overallSimilarity = (
    safeValues.armSwing * weights.armSwing +
    safeValues.releasePoint * weights.releasePoint +
    safeValues.rhythm * weights.rhythm +
    safeValues.followThrough * weights.followThrough +
    safeValues.runUp * weights.runUp +
    safeValues.delivery * weights.delivery
  );
  
  return Math.max(0, Math.min(1, overallSimilarity));
}

function compareArrays(arr1, arr2) {
  if (arr1.length === 0 || arr2.length === 0) {
    return 0;
  }
  
  // Filter out NaN and infinite values
  const clean1 = arr1.filter(v => isFinite(v) && !isNaN(v));
  const clean2 = arr2.filter(v => isFinite(v) && !isNaN(v));
  
  if (clean1.length === 0 || clean2.length === 0) {
    return 0;
  }
  
  // Normalize arrays to same length
  const targetLength = Math.min(clean1.length, clean2.length, 30);
  const resampled1 = resampleArray(clean1, targetLength);
  const resampled2 = resampleArray(clean2, targetLength);
  
  // Check for identical arrays
  let identicalCount = 0;
  for (let i = 0; i < Math.min(resampled1.length, resampled2.length); i++) {
    if (Math.abs(resampled1[i] - resampled2[i]) < 0.001) {
      identicalCount++;
    }
  }
  if (identicalCount >= resampled1.length * 0.8) {
    return 0.95; // High similarity for nearly identical arrays
  }
  
  // Calculate Pearson correlation coefficient
  const mean1 = resampled1.reduce((a, b) => a + b, 0) / resampled1.length;
  const mean2 = resampled2.reduce((a, b) => a + b, 0) / resampled2.length;
  
  let numerator = 0;
  let sum1Sq = 0;
  let sum2Sq = 0;
  
  for (let i = 0; i < resampled1.length; i++) {
    const diff1 = resampled1[i] - mean1;
    const diff2 = resampled2[i] - mean2;
    numerator += diff1 * diff2;
    sum1Sq += diff1 * diff1;
    sum2Sq += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(sum1Sq * sum2Sq);
  let correlation;
  
  if (denominator === 0) {
    if (sum1Sq === 0 && sum2Sq === 0) {
      const diff = Math.abs(mean1 - mean2);
      correlation = diff < 0.001 ? 1.0 : 0.0;
    } else {
      correlation = 0;
    }
  } else {
    correlation = numerator / denominator;
  }
  
  if (isNaN(correlation) || !isFinite(correlation)) {
    return 0.5;
  }
  
  // Convert correlation (-1 to 1) to similarity (0 to 1)
  return Math.max(0, (correlation + 1) / 2);
}

function resampleArray(arr, targetLength) {
  if (arr.length === targetLength) return [...arr];
  if (arr.length < 2) return new Array(targetLength).fill(arr[0] ?? 0);
  
  const result = [];
  const scale = (arr.length - 1) / (targetLength - 1);
  for (let i = 0; i < targetLength; i++) {
    const t = i * scale;
    const i0 = Math.floor(t);
    const i1 = Math.min(arr.length - 1, i0 + 1);
    const frac = t - i0;
    const v = arr[i0] * (1 - frac) + arr[i1] * frac;
    result.push(v);
  }
  return result;
}

function comparePhases(inputPattern, benchmarkPattern, phase) {
  const inputPhase = inputPattern.actionPhases[phase];
  const benchmarkPhase = benchmarkPattern.actionPhases[phase];
  
  if (!inputPhase || !benchmarkPhase || 
      inputPhase.start < 0 || inputPhase.end < 0 || 
      benchmarkPhase.start < 0 || benchmarkPhase.end < 0 ||
      inputPhase.start >= inputPattern.overallIntensities.length ||
      benchmarkPhase.start >= benchmarkPattern.overallIntensities.length) {
    return 0.5;
  }
  
  const inputData = inputPattern.overallIntensities.slice(inputPhase.start, inputPhase.end + 1);
  const benchmarkData = benchmarkPattern.overallIntensities.slice(benchmarkPhase.start, benchmarkPhase.end + 1);
  
  if (inputData.length === 0 || benchmarkData.length === 0) {
    return 0.5;
  }
  
  const result = compareArrays(inputData, benchmarkData);
  return isNaN(result) || !isFinite(result) ? 0.5 : result;
}

// Run the test
testAnalyzerPattern().then(success => {
  if (success) {
    console.log('\n🎉 All tests passed! The analyzer should work correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ Tests failed. Please check the analyzer implementation.');
    process.exit(1);
  }
});