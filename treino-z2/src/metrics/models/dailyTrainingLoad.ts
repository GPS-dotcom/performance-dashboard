/** One day's total training load (output of trainingLoadCalculator, summed across that day's sessions). */
export interface DailyTrainingLoad {
  date: string; // YYYY-MM-DD
  load: number;
}
