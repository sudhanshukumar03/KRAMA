const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateRelease, protectionPayload } = require('./github-release.cjs');
function passing() {
  return { remoteSha: 'a'.repeat(40), expectedSha: 'a'.repeat(40), localWorkflowHash: 'same', remoteWorkflowHash: 'same', model: 'gemini-3.6-flash',
    run: { head_sha: 'a'.repeat(40), path: '.github/workflows/ci.yml', event: 'workflow_dispatch', conclusion: 'success' },
    jobs: ['build-and-test', 'production-staging', 'real-ai (groq)', 'real-ai (gemini)', 'release-ready'].map(name => ({ name, conclusion: 'success' })),
    check: { name: 'release-ready', head_sha: 'a'.repeat(40), app: { slug: 'github-actions', id: 15368 }, conclusion: 'success' }, protection: null };
}
test('activation requires the exact published workflow and unchanged main revision', () => {
  const state = passing(); state.remoteSha = 'b'.repeat(40); state.remoteWorkflowHash = 'old';
  const result = evaluateRelease(state); assert.equal(result.ready, false);
  assert.ok(result.failures.includes('REMOTE_COMMIT_CHANGED')); assert.ok(result.failures.includes('WORKFLOW_NOT_PUBLISHED'));
});
test('a normal green push cannot replace explicit successful real-provider qualification', () => {
  const state = passing(); state.run.event = 'push'; state.jobs.find(job => job.name === 'real-ai (gemini)').conclusion = 'skipped';
  const result = evaluateRelease(state); assert.equal(result.ready, false);
  assert.ok(result.failures.includes('REQUIRED_RUN_NOT_SUCCESSFUL')); assert.ok(result.failures.includes('JOB_NOT_SUCCESSFUL:real-ai (gemini)'));
});
test('a similarly named check from another app or revision cannot activate protection', () => {
  const state = passing(); state.check.head_sha = 'b'.repeat(40); state.check.app.id = 123;
  assert.ok(evaluateRelease(state).failures.includes('REQUIRED_CHECK_NOT_TRUSTED'));
});
test('existing different protection must be reviewed rather than replaced', () => {
  const state = passing(); state.protection = { required_status_checks: { strict: false } };
  assert.ok(evaluateRelease(state).failures.includes('EXISTING_PROTECTION_REQUIRES_REVIEW'));
});
test('matching protection is preserved and does not need another write', () => {
  const state = passing(); state.protection = { required_status_checks: { strict: true, checks: [{ context: 'release-ready', app_id: 15368 }] }, enforce_admins: { enabled: true }, required_pull_request_reviews: {}, required_conversation_resolution: { enabled: true }, allow_force_pushes: { enabled: false }, allow_deletions: { enabled: false } };
  assert.deepEqual(evaluateRelease(state), { ready: true, failures: [], alreadyProtected: true });
  state.protection.allow_force_pushes.enabled = true;
  assert.equal(evaluateRelease(state).ready, false);
});
test('successful pinned provider and current trusted checks permit the explicit protection plan', () => {
  assert.equal(evaluateRelease(passing()).ready, true);
  const state = passing(); state.model = 'gemini-3.8-flash'; assert.equal(evaluateRelease(state).ready, false);
  assert.equal(protectionPayload().enforce_admins, true); assert.equal(protectionPayload().allow_force_pushes, false);
  assert.equal(protectionPayload().required_pull_request_reviews.required_approving_review_count, 0);
});
