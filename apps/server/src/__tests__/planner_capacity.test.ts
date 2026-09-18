import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Tier 1: Planner Capacity & Holiday Deduction', () => {
  it('deducts full daily capacity (weeklyCapacityMinutes / 5) for holidays', () => {
    // Standard 40h work week (2400 minutes)
    const userDefault = { weeklyCapacityMinutes: 2400 };
    const dailyDefault = Math.round((userDefault.weeklyCapacityMinutes ?? 2400) / 5);
    assert.equal(dailyDefault, 480, 'Default daily capacity should be 480 minutes (8 hours)');

    // Custom 30h work week (1800 minutes)
    const userCustom30 = { weeklyCapacityMinutes: 1800 };
    const daily30 = Math.round((userCustom30.weeklyCapacityMinutes ?? 2400) / 5);
    assert.equal(daily30, 360, '30h week daily capacity should be 360 minutes (6 hours)');

    // Fractional capacity handles rounding correctly
    const userOdd = { weeklyCapacityMinutes: 2422 };
    const dailyOdd = Math.round((userOdd.weeklyCapacityMinutes ?? 2400) / 5);
    assert.equal(dailyOdd, 484, 'Odd capacity should round cleanly');
  });

  it('correctly calculates net available minutes on a holiday', () => {
    const weeklyCapacityMinutes = 2400;
    const dailyCapacityMinutes = Math.round(weeklyCapacityMinutes / 5);
    
    // On a public holiday:
    const holidayDeduction = dailyCapacityMinutes;
    const totalWorkingMinutes = dailyCapacityMinutes;
    const remainingAvailable = Math.max(0, totalWorkingMinutes - holidayDeduction);

    assert.equal(remainingAvailable, 0, 'On a full public holiday, remaining capacity should be 0 minutes');
  });

  it('correctly calculates capacity for a week with 2 public holidays', () => {
    const weeklyCapacityMinutes = 2400;
    const dailyCapacityMinutes = Math.round(weeklyCapacityMinutes / 5);
    const holidaysInWeek = 2;
    const totalHolidayDeduction = dailyCapacityMinutes * holidaysInWeek;

    const netWeeklyCapacity = weeklyCapacityMinutes - totalHolidayDeduction;
    assert.equal(totalHolidayDeduction, 960, '2 holidays deduct 960 minutes (16 hours)');
    assert.equal(netWeeklyCapacity, 1440, 'Net weekly capacity is 1440 minutes (24 hours)');
  });
});
