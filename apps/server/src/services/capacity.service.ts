interface TimeBlockInput {
  startTime: Date;
  endTime: Date;
  type: string;
}

function mergeIntervals(intervals: { start: Date; end: Date }[]) {
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: { start: Date; end: Date }[] = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push({ ...interval });
      continue;
    }
    if (interval.start.getTime() > previous.end.getTime()) {
      merged.push({ ...interval });
      continue;
    }
    if (interval.end.getTime() > previous.end.getTime()) {
      previous.end = interval.end;
    }
  }

  return merged;
}

function durationMinutes(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function calculateCapacity(weeklyCapacityMinutes: number, blocks: TimeBlockInput[]) {
  const merged = mergeIntervals(
    blocks.map((block) => ({ start: block.startTime, end: block.endTime }))
  );

  const occupiedMinutes = merged.reduce(
    (total, interval) => total + durationMinutes(interval.start, interval.end),
    0
  );

  const meetingMinutes = blocks
    .filter((block) => block.type === 'MEETING')
    .reduce((total, block) => total + durationMinutes(block.startTime, block.endTime), 0);

  const freeMinutes = Math.max(0, weeklyCapacityMinutes - occupiedMinutes);

  return {
    weeklyCapacityMinutes,
    occupiedMinutes,
    meetingMinutes,
    otherMinutes: Math.max(0, occupiedMinutes - meetingMinutes),
    freeMinutes,
    completionPercent:
      weeklyCapacityMinutes === 0
        ? 0
        : Math.min(100, Math.round((occupiedMinutes / weeklyCapacityMinutes) * 100)),
  };
}
