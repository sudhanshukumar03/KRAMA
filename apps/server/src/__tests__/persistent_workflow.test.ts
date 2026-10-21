import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attachGoalDescendants } from '../lib/goalTree';
import { resolveUserTimeZone } from '../services/habitStreak.service';
import { scheduleTaskPatch, deferTaskPatch } from '../../../web/src/lib/plannerTaskActions';
import { goalMatchesSearch } from '../../../web/src/lib/goalUtils';

describe('Persistent personal-workspace contracts', () => {
  it('keeps a deep goal visible in both the flat collection and full root subtree', () => {
    const goals = attachGoalDescendants(Array.from({ length: 5 }, (_, i) => ({ id: String(i), parentGoalId: i ? String(i - 1) : null, title: `Goal ${i}` })));
    assert.equal(goals.length, 5);
    assert.equal(JSON.parse(JSON.stringify(goals[0])).childGoals[0].childGoals[0].childGoals[0].childGoals[0].id, '4');
    assert.equal(goalMatchesSearch(goals[0] as any, 'goal 4'), true);
    assert.equal(goalMatchesSearch(goals[0] as any, 'missing'), false);
  });
  it('does not create recursive object cycles from corrupt legacy hierarchy data', () => {
    const goals = attachGoalDescendants([{ id: 'a', parentGoalId: 'b' }, { id: 'b', parentGoalId: 'a' }]);
    assert.doesNotThrow(() => JSON.stringify(goals));
  });
  it('scheduling activates backlog work without losing unrelated metadata', () => {
    const patch = scheduleTaskPatch({ status: 'BACKLOG', version: 3, metadata: { inbox: true, source: 'note' } }, '2026-10-19T12:00:00Z');
    assert.equal(patch.status, 'TODO');
    assert.deepEqual(patch.metadata, { inbox: false, source: 'note' });
    assert.equal(patch.version, 3);
  });
  it('deferring clears the plan and Inbox state without overwriting the deadline', () => {
    const patch = deferTaskPatch({ status: 'TODO', metadata: { source: 'capture' } });
    assert.equal(patch.status, 'BACKLOG'); assert.equal(patch.scheduledDate, null);
    assert.equal('dueDate' in patch, false);
    assert.deepEqual(patch.metadata, { source: 'capture', inbox: false });
  });
  it('uses a valid browser timezone ahead of a regional or saved fallback', () => {
    assert.equal(resolveUserTimeZone({ countryCode: 'US', metadata: { timezone: 'UTC' } }, 'Pacific/Kiritimati'), 'Pacific/Kiritimati');
    assert.throws(() => resolveUserTimeZone(null, 'invalid/zone'), /Invalid timezone/);
    assert.equal(resolveUserTimeZone({ countryCode: 'IN', metadata: { timezone: 'invalid/zone' } }), 'Asia/Kolkata');
  });
});
