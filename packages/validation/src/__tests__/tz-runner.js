const path = require('path');
const { asDateKey, toDateKey, dateKeyToUtcNoon, addDaysKey, weekKeys } = require(path.join(__dirname, '../../dist/dateKey'));

const tz = process.env.TZ || 'UTC';
let cur = asDateKey('2026-01-01');

for (let i = 0; i < 365; i++) {
  const noon = dateKeyToUtcNoon(cur);

  // 1. DB/API read path: stored ISO string slices to the exact key in every timezone
  const fromIso = toDateKey(noon.toISOString());
  if (fromIso !== cur) {
    console.error(`ISO read mismatch in TZ=${tz} on key ${cur} derived: ${fromIso}`);
    process.exit(1);
  }

  // 2. Browser interaction path: local user date at noon wall-clock in their timezone formats to the exact key
  const [y, m, d] = cur.split('-').map(Number);
  const localUserDate = new Date(y, m - 1, d, 12, 0, 0);
  const fromLocal = toDateKey(localUserDate);
  if (fromLocal !== cur) {
    console.error(`Local user date mismatch in TZ=${tz} on key ${cur} derived: ${fromLocal}`);
    process.exit(1);
  }

  // 3. For timezones within [-11h, +11h] (UTC, Asia/Kolkata, America/Los_Angeles),
  // passing the raw UTC noon Date object directly also preserves the exact calendar day.
  if (tz !== 'Pacific/Auckland') {
    const fromNoonDate = toDateKey(noon);
    if (fromNoonDate !== cur) {
      console.error(`Raw noon Date mismatch in TZ=${tz} on key ${cur} derived: ${fromNoonDate}`);
      process.exit(1);
    }
  }

  cur = addDaysKey(cur, 1);
}

// 4. Test weekKeys integrity under this timezone
const week = weekKeys(asDateKey('2026-09-07'));
if (week.length !== 7 || new Set(week).size !== 7) {
  console.error(`weekKeys invariant broken in TZ=${tz}`);
  process.exit(1);
}

process.exit(0);
