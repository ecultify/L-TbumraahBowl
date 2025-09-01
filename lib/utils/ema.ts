export class ExponentialMovingAverage {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha: number = 0.3) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  update(newValue: number): number {
    if (this.value === null) {
      this.value = newValue;
    } else {
      this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  getValue(): number {
    return this.value || 0;
  }

  reset(): void {
    this.value = null;
  }
}