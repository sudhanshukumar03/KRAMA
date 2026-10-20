const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { parseArgs } = require('node:util');
const root = resolve(__dirname, '../..');
const repository = 'sudhanshukumar03/KRAMA';
const branch = 'main';
const workflow = '.github/workflows/ci.yml';
const requiredJobs = ['build-and-test', 'production-staging', 'real-ai (groq)', 'real-ai (gemini)', 'release-ready'];
const digest = text => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

function evaluateRelease(state) {
  const failures = [];
  if (state.remoteSha !== state.expectedSha) failures.push('REMOTE_COMMIT_CHANGED');
  if (state.localWorkflowHash !== state.remoteWorkflowHash) failures.push('WORKFLOW_NOT_PUBLISHED');
  if (state.model !== 'gemini-3.6-flash') failures.push('GEMINI_MODEL_NOT_CONFIGURED');
  if (state.run?.head_sha !== state.expectedSha || state.run?.path !== workflow || state.run?.event !== 'workflow_dispatch' || state.run?.conclusion !== 'success') failures.push('REQUIRED_RUN_NOT_SUCCESSFUL');
  for (const name of requiredJobs) {
    const jobs = state.jobs.filter(job => job.name === name);
    if (jobs.length !== 1 || jobs[0].conclusion !== 'success') failures.push(`JOB_NOT_SUCCESSFUL:${name}`);
  }
  if (state.check?.name !== 'release-ready' || state.check?.head_sha !== state.expectedSha || state.check?.app?.slug !== 'github-actions' || state.check?.app?.id !== 15368 || state.check?.conclusion !== 'success') failures.push('REQUIRED_CHECK_NOT_TRUSTED');
  const protection = state.protection;
  const alreadyProtected = Boolean(protection?.required_status_checks?.strict && protection.enforce_admins?.enabled && protection.required_pull_request_reviews && protection.required_conversation_resolution?.enabled && protection.allow_force_pushes?.enabled === false && protection.allow_deletions?.enabled === false && protection.required_status_checks.checks?.some(check => check.context === 'release-ready' && check.app_id === 15368));
  if (protection && !alreadyProtected) failures.push('EXISTING_PROTECTION_REQUIRES_REVIEW');
  return { ready: failures.length === 0, failures, alreadyProtected };
}

function protectionPayload() {
  return {
    required_status_checks: { strict: true, contexts: [], checks: [{ context: 'release-ready', app_id: 15368 }] },
    enforce_admins: true,
    required_pull_request_reviews: { dismiss_stale_reviews: true, require_code_owner_reviews: false, required_approving_review_count: 0 },
    restrictions: null, allow_force_pushes: false, allow_deletions: false, required_conversation_resolution: true,
  };
}

async function main() {
  const { values } = parseArgs({ options: { sha: { type: 'string' }, apply: { type: 'boolean', default: false } }, strict: true });
  if (values.apply && !/^[a-f0-9]{40}$/.test(values.sha || '')) throw new Error('--apply requires the exact reviewed 40-character --sha.');
  if (values.sha && !/^[a-f0-9]{40}$/.test(values.sha)) throw new Error('Invalid --sha.');
  function api(endpoint, allow404 = false, input) {
    const args = ['api', '-H', 'Accept: application/vnd.github+json', endpoint];
    if (input) args.push('--method', 'PUT', '--input', '-');
    try { return JSON.parse(execFileSync('gh', args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'], ...(input ? { input: JSON.stringify(input) } : {}) })); }
    catch (error) {
      let body; try { body = JSON.parse(String(error.stdout)); } catch {}
      if (allow404 && body?.status === '404') return null;
      throw new Error(`GitHub request failed for ${endpoint}. Check gh authentication and repository permissions.`);
    }
  }
  const base = `repos/${repository}`;
  const remote = api(`${base}/branches/${branch}`);
  const expectedSha = values.sha || remote.commit.sha;
  const content = api(`${base}/contents/${workflow}?ref=${expectedSha}`);
  const remoteWorkflowHash = digest(Buffer.from(content.content, 'base64').toString('utf8'));
  const localWorkflowHash = digest(readFileSync(resolve(root, workflow), 'utf8'));
  const runs = api(`${base}/actions/runs?head_sha=${expectedSha}&event=workflow_dispatch&status=success&per_page=100`).workflow_runs;
  let run = null, jobs = [], check = null;
  for (const candidate of runs.filter(item => item.path === workflow)) {
    const candidateJobs = api(`${base}/actions/runs/${candidate.id}/jobs?filter=latest&per_page=100`).jobs;
    if (!requiredJobs.every(name => candidateJobs.some(job => job.name === name && job.conclusion === 'success'))) continue;
    run = candidate; jobs = candidateJobs;
    const gate = candidateJobs.find(job => job.name === 'release-ready');
    check = api(new URL(gate.check_run_url).pathname.replace(/^\//, ''));
    break;
  }
  const model = api(`${base}/environments/ai-verification/variables/GEMINI_TEXT_MODEL`, true)?.value;
  const protection = api(`${base}/branches/${branch}/protection`, true);
  const state = { remoteSha: remote.commit.sha, expectedSha, localWorkflowHash, remoteWorkflowHash, model, run, jobs, check, protection };
  const verdict = evaluateRelease(state);
  if (values.apply && !verdict.ready) throw new Error(`Activation refused: ${verdict.failures.join(', ')}`);
  if (values.apply && !verdict.alreadyProtected) {
    // Recheck after the network reads; never protect a different main revision.
    if (api(`${base}/branches/${branch}`).commit.sha !== expectedSha) throw new Error('Activation refused: main changed during verification.');
    if (api(`${base}/branches/${branch}/protection`, true)) throw new Error('Activation refused: branch protection changed during verification.');
    api(`${base}/branches/${branch}/protection`, false, protectionPayload());
  }
  const report = { repository, branch, expectedSha, ...verdict, applied: Boolean(values.apply), workflowMatches: localWorkflowHash === remoteWorkflowHash, runUrl: run?.html_url || null, selectedModel: model || null, protectionPlan: protectionPayload() };
  console.log(JSON.stringify(report, null, 2));
  if (!verdict.ready) process.exitCode = 1;
}

module.exports = { evaluateRelease, protectionPayload };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
