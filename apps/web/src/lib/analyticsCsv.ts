export function analyticsCsv(rows: any[]) {
  const columns = ['Date', 'Completed tasks', 'Rolling 7-day tasks', 'Focus minutes', 'Planner log minutes', 'Active personal streaks', 'Current goal progress percent'];
  return [columns.join(','), ...rows.map(row => [row.dayKey, row.completedTasks, row.weeklyVelocity, Number(row.deepWorkLogged.toFixed(2)), row.loggedDeepWork ?? '', row.activeStreaks, row.okrPace ?? ''].join(','))].join('\r\n');
}

