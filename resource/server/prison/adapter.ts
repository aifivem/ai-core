/** One prison script's answers; ai-core's prison layer (lib `prison`) forwards to the first running one. */
export interface PrisonAdapter {
  readonly resource: string;
  readonly version?: string;
  jail(source: number, minutes: number, by: number): boolean;
  release(source: number): boolean;
  timeLeft(source: number): number;
}
