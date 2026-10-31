/** One prison script's answers; ai-core's prison layer (lib `prison`) forwards to the first running one. */
export interface PrisonAdapter {
  readonly resource: string;
  readonly version?: string;
  /** Runs next to ai-prison on purpose (a police job with its own jail): it does not make ai-prison unneeded. */
  readonly besideOurs?: boolean;
  jail(source: number, minutes: number, by: number): boolean;
  release(source: number): boolean;
  timeLeft(source: number): number;
}
