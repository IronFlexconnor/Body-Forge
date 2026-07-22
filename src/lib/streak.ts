// True training streak: consecutive weeks (Sunday-based, matching the
// dashboard's "This week" window) with at least one logged workout.
// The current week counts if it has a session; an empty current week
// doesn't break the streak until it's over.
// Shared by the Home dashboard and the global TopBar.

export function computeWeekStreak(logs: { started_at: string }[]): number {
  if (!logs.length) return 0;
  const weekStart = (d: Date) => {
    const w = new Date(d);
    w.setDate(w.getDate() - w.getDay());
    w.setHours(0, 0, 0, 0);
    return w.getTime();
  };
  const weeks = new Set(logs.map((l) => weekStart(new Date(l.started_at))));
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  let cursor = weekStart(new Date());
  let streak = 0;
  // An empty current week doesn't break the streak until it's over.
  if (!weeks.has(cursor)) cursor -= WEEK;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor -= WEEK;
  }
  return streak;
}
