/** A script that keeps prime hours itself and answers whether it is prime time for a job. */
export interface PrimeTimeAdapter {
  readonly resource: string;
  /** The version the adapter is written for (a different installed version is warned once). */
  readonly version?: string;
  isPrimeTime(job?: string): boolean;
}
