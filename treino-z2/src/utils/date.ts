export function currentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  const nextMonday = new Date(monday.getTime() + 7 * 86400000);
  return { start: monday.toISOString().slice(0, 10), end: nextMonday.toISOString().slice(0, 10) };
}
