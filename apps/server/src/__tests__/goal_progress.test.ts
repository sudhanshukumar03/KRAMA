import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAutoProgress, computeWeightedRollup } from '../services/goal.service';

// These exercise the REAL shipped pure formulas behind Goal auto-progress and the
// weighted parent rollup (computeAutoProgress / computeWeightedRollup in goal.service),
// so they run without a database — the DB-backed transaction wrappers are covered by
// integration suites that require a reachable test Postgres.

describe('Tier 1: Goal auto-progress (computeAutoProgress)', () => {
  it('returns 0 when there are no tasks', () => {
    assert.equal(computeAutoProgress([]), 0);
  });

  it('computes DONE / total as a rounded percent', () => {
    const tasks = [
      { status: 'DONE' },
      { status: 'DONE' },
      { status: 'IN_PROGRESS' },
      { status: 'TODO' },
    ];
    assert.equal(computeAutoProgress(tasks), 50); // 2 / 4
  });

  it('excludes CANCELED tasks from the denominator', () => {
    const tasks = [
      { status: 'DONE' },
      { status: 'DONE' },
      { status: 'TODO' },
      { status: 'CANCELED' },
      { status: 'CANCELED' },
    ];
    // 2 done / 3 countable (CANCELED dropped) = 67%
    assert.equal(computeAutoProgress(tasks), 67);
  });

  it('returns 0 when every remaining task is CANCELED', () => {
    assert.equal(computeAutoProgress([{ status: 'CANCELED' }, { status: 'CANCELED' }]), 0);
  });

  it('returns 100 when all countable tasks are DONE', () => {
    assert.equal(
      computeAutoProgress([{ status: 'DONE' }, { status: 'DONE' }, { status: 'CANCELED' }]),
      100
    );
  });
});

describe('Tier 1: Goal weighted rollup (computeWeightedRollup)', () => {
  it('returns 0 for no siblings', () => {
    assert.equal(computeWeightedRollup([]), 0);
  });

  it('reduces to a plain average when weights are absent (default 1)', () => {
    const siblings = [
      { progress: 40, metadata: null },
      { progress: 60, metadata: {} },
      { progress: 80, metadata: undefined },
    ];
    assert.equal(computeWeightedRollup(siblings), 60); // (40+60+80)/3
  });

  it('weights children by metadata.weight', () => {
    const siblings = [
      { progress: 100, metadata: { weight: 3 } },
      { progress: 0, metadata: { weight: 1 } },
    ];
    // (100*3 + 0*1) / 4 = 75
    assert.equal(computeWeightedRollup(siblings), 75);
  });

  it('ignores non-positive / non-numeric weights (falls back to 1)', () => {
    const siblings = [
      { progress: 50, metadata: { weight: 0 } },
      { progress: 100, metadata: { weight: 'nonsense' } },
    ];
    // both weights coerced to 1 → (50+100)/2 = 75
    assert.equal(computeWeightedRollup(siblings), 75);
  });
});
