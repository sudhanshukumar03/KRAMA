import { test, expect } from './fixtures';
import { cpus, totalmem } from 'node:os';

test.skip(process.env.KRAMA_QUALITY_BASELINE !== '1', 'Explicit opt-in measurement using a freshly built client');

test('record production-client quality baseline with isolated synthetic work', async ({ page, account }, info) => {
  const observations: unknown[] = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const entries: { name: string; startTime: number; value?: number }[] = [];
    (window as typeof window & { qualityEntries?: typeof entries }).qualityEntries = entries;
    for (const type of ['largest-contentful-paint','layout-shift','longtask']) {
      try { new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const detail = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (type !== 'layout-shift' || !detail.hadRecentInput) entries.push({ name: type, startTime: detail.startTime, value: type === 'longtask' ? detail.duration : detail.value });
        }
      }).observe({ type, buffered: true }); } catch { /* Report only supported measurements. */ }
    }
  });
  await account.signIn(page);
  async function capture(name: string, route: string, ready: () => Promise<unknown>) {
    const started = performance.now();
    await page.goto(route); await ready(); await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const renderMs = performance.now() - started;
    const measurements = await page.evaluate(() => ({
      entries: (window as typeof window & { qualityEntries?: unknown[] }).qualityEntries,
      resources: performance.getEntriesByType('resource').map(entry => {
        const resource = entry as PerformanceResourceTiming;
        return { path: new URL(resource.name).pathname, transferBytes: resource.transferSize, decodedBytes: resource.decodedBodySize };
      }).filter(entry => entry.path.startsWith('/assets/')),
      overflow: document.documentElement.scrollWidth - innerWidth,
    }));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const heap = (await cdp.send('Performance.getMetrics')).metrics.find(row => row.name === 'JSHeapUsedSize')?.value;
    await cdp.detach();
    observations.push({ name, renderMs, heapBytes: heap, ...measurements });
    await info.attach(name, { body: await page.screenshot(), contentType: 'image/png' });
    expect(measurements.overflow, `${name}: page-level horizontal overflow`).toBeLessThanOrEqual(1);
  }
  for (const theme of ['light','dark']) for (const width of [1440,390]) {
    await page.evaluate(theme => localStorage.setItem('krama-theme',theme),theme);
    await page.setViewportSize({ width,height:900 });
    await capture(`empty-goals-${width}-${theme}`, '/app/goals', () => expect(page.getByText('What would you like to work towards? Create your first goal to get started.')).toBeVisible());
  }
  const title = 'Build a thoughtful portfolio with a clear story, accessible interactions and carefully documented decisions for the work I want to do next';
  const goal = await account.call('POST','goals',{ title,type:'quarterly',metadata:{ category:'learning',whyStatement:'Keep the work and the reasons for it together.' } },201);
  const project = await account.call('POST','projects',{ name:'Portfolio refresh',goalId:goal.id },201);
  await account.call('POST','habits',{ name:'Read and capture one useful idea',linkedGoalId:goal.id },201);
  const day = new Intl.DateTimeFormat('en-CA',{ timeZone:'Asia/Kolkata' }).format(new Date());
  for (let index=0;index<12;index++) await account.call('POST','tasks',{ title:`Portfolio task ${index+1}: review evidence and refine the next step`,projectId:project.id,status:index%3 ? 'TODO':'DONE',scheduledDate:`${day}T12:00:00Z`,estimateMinutes:25 },201);
  const space = await account.call('POST','spaces',{ name:'Quality baseline notes' },201);
  const doc = await account.call('POST','documents',{ title:'Portfolio research and decisions',spaceId:space.id,contentJson:{type:'doc',content:Array.from({length:30},(_,index)=>({type:'paragraph',content:[{type:'text',text:`Research note ${index+1}. Capture what changed, why it matters, and what to try next. ` .repeat(5)}]}))} },201);
  for (const theme of ['light','dark']) for (const width of [1440,390]) {
    await page.evaluate(theme => localStorage.setItem('krama-theme',theme),theme);
    await page.setViewportSize({ width,height:900 });
    await capture(`dashboard-${width}-${theme}`,'/app',()=>expect(page.getByRole('heading',{name:/Good (morning|afternoon|evening)/})).toBeVisible());
    await capture(`goal-detail-long-${width}-${theme}`,`/app/goals?goal=${goal.id}`,()=>expect(page.getByRole('dialog',{name:'Goal details'})).toBeVisible());
    await capture(`planner-${width}-${theme}`,`/app/planner?mode=day&date=${day}`,()=>expect(page.getByRole('heading',{name:'Planner',exact:true})).toBeVisible());
    await capture(`brain-long-${width}-${theme}`,`/app/brain?doc=${doc.id}`,()=>expect(page.getByRole('textbox',{name:'Document body',exact:true})).toContainText('Research note 30.'));
    const body = page.getByRole('textbox',{name:'Document body',exact:true});
    await body.evaluate(element => {
      (window as typeof window & { qualityInputFrameMs?: number }).qualityInputFrameMs = undefined;
      element.addEventListener('input', () => {
        const start = performance.now();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          (window as typeof window & { qualityInputFrameMs?: number }).qualityInputFrameMs = performance.now()-start;
        }));
      }, { once:true });
    });
    const editStarted = performance.now(); await body.press('Control+End'); await body.pressSequentially(' A verified baseline edit.');
    await expect(page.getByRole('status').filter({hasText:/^Saved$/})).toBeVisible();
    observations.push({name:`editor-edit-and-save-${width}-${theme}`,elapsedMs:performance.now()-editStarted,inputToTwoAnimationFramesMs:await page.evaluate(()=>(window as typeof window & {qualityInputFrameMs?:number}).qualityInputFrameMs)});
  }
  const timings: number[] = [];
  await Promise.all(Array.from({length:10},async()=>{ for(let index=0;index<5;index++) {
    const start=performance.now(); await account.call('GET','tasks'); timings.push(performance.now()-start);
  }}));
  timings.sort((a,b)=>a-b);
  observations.push({name:'task-reads-10-clients-50-requests',samples:timings.length,p50:timings[Math.ceil(timings.length*.5)-1],p95:timings[Math.ceil(timings.length*.95)-1]});
  const writes: number[] = [];
  await Promise.all(Array.from({length:10},async(_,client)=>{ for(let index=0;index<5;index++) {
    const start=performance.now(); await account.call('POST','tasks',{title:`Synthetic workload ${client}:${index}`},201); writes.push(performance.now()-start);
  }}));
  writes.sort((a,b)=>a-b);
  observations.push({name:'task-writes-10-clients-50-requests',samples:writes.length,p50:writes[Math.ceil(writes.length*.5)-1],p95:writes[Math.ceil(writes.length*.95)-1]});
  await info.attach('quality-measurements',{body:JSON.stringify({profile:'Local API and production Vite preview; 12 initial tasks/one goal/project/habit/document, followed by 50 synthetic creates; browser cache retained; no throttling; not field Web Vitals',machine:{platform:process.platform,node:process.version,cpu:cpus()[0]?.model,totalMemoryBytes:totalmem(),ci:!!process.env.CI},observations},null,2),contentType:'application/json'});
  for(const observation of observations){
    const row=observation as {name:string;renderMs?:number;elapsedMs?:number;inputToTwoAnimationFramesMs?:number};
    if(row.renderMs!==undefined)expect(row.renderMs,row.name+' route-to-ready budget').toBeLessThanOrEqual(2000);
    if(row.elapsedMs!==undefined)expect(row.elapsedMs,row.name+' edit-through-save budget').toBeLessThanOrEqual(2000);
    if(row.inputToTwoAnimationFramesMs!==undefined)expect(row.inputToTwoAnimationFramesMs,row.name+' input/frame budget').toBeLessThanOrEqual(50);
  }
  expect(timings[Math.ceil(timings.length*.95)-1],'task read p95 budget').toBeLessThanOrEqual(500);
  expect(writes[Math.ceil(writes.length*.95)-1],'task create p95 budget').toBeLessThanOrEqual(750);
});
