import { test, expect, type Page } from '@playwright/test';

const title = 'Build a thoughtful portfolio with a clear story, accessible interactions and carefully documented decisions for the work I want to do next';
async function seed(page: Page, targetDate?: string, status = 'ACTIVE') {
  await page.route('**/socket.io/**', route => route.abort());
  let goal = { id:'quality-goal',title,version:1,progress:20,type:'quarterly',createdAt:'2026-10-01T00:00:00Z',targetDate,parentGoalId:null,childGoals:[],metadata:{category:'learning',status,progressMode:'manual'},snapshots:[] };
  await page.route('**/api/v1/**',route=>{
    const path=new URL(route.request().url()).pathname.replace('/api/v1','');
    let data:unknown=[];
    if(path==='/auth/refresh')data={accessToken:'synthetic-quality-token'};
    else if(path==='/auth/me')data={user:{id:'quality-user',name:'Alex',memberships:[{workspaceId:'quality-workspace',role:'OWNER',workspace:{id:'quality-workspace',name:'Personal'}}]}};
    else if(path==='/workspaces')data=[{id:'quality-workspace',name:'Personal'}];
    else if(path.startsWith('/goals')){
      if(route.request().method()==='PATCH')goal={...goal,...route.request().postDataJSON(),version:goal.version+1};
      data=path.endsWith('/quality-goal')?goal:[goal];
    }
    return route.fulfill({json:data});
  });
  return goal;
}

for(const width of [320,390,768,1440])for(const theme of ['light','dark'])test(`goal details preserve readable content and safe controls at ${width}px in ${theme}`,async({page},info)=>{
  await page.setViewportSize({width,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(theme=>localStorage.setItem('krama-theme',theme),theme);
  await seed(page);await page.goto('/app/goals?goal=quality-goal');
  const drawer=page.getByRole('dialog',{name:'Goal details'});
  await expect(drawer).toBeVisible();
  const heading=drawer.getByRole('heading',{name:title,exact:true});
  expect(await heading.evaluate(element=>element.scrollWidth<=element.clientWidth+1),'long goal title is visually truncated').toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const geometry=async()=>drawer.locator('button,input:not([type="radio"]),select,textarea,[role="tab"]').evaluateAll(elements=>{
    const visible=elements.filter(element=>element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden');
    return visible.map(element=>({label:element.getAttribute('aria-label')||element.getAttribute('title')||element.textContent?.trim(),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}));
  });
  const overview=await geometry();
  await info.attach(`overview-${width}-${theme}`,{body:await page.screenshot(),contentType:'image/png'});
  await drawer.getByRole('tab',{name:'Edit Settings'}).click();
  const input=drawer.getByLabel('Goal title',{exact:true});
  await input.fill('An unsaved goal title');
  const settings=await geometry();
  if(width<768)expect(parseFloat(await input.evaluate(element=>getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
  await drawer.getByRole('button',{name:'Close goal details',exact:true}).click();
  const confirmation=page.getByRole('alertdialog',{name:'Discard unsaved changes?'});
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByRole('button',{name:'Keep editing'})).toBeFocused();
  await page.keyboard.press('Escape');await expect(confirmation).toBeHidden();await expect(input).toHaveValue('An unsaved goal title');
  await expect(drawer.getByRole('button',{name:'Close goal details',exact:true})).toBeFocused();
  await drawer.getByRole('button',{name:'Close goal details',exact:true}).click();
  await confirmation.getByRole('button',{name:'Discard changes'}).click();await expect(drawer).toBeHidden();
  const offenders=[...overview,...settings].filter(control=>control.width<43.5||control.height<43.5);
  await info.attach('interactive-target-geometry',{body:JSON.stringify({width,theme,overview,settings,offenders},null,2),contentType:'application/json'});
  expect(offenders).toEqual([]);
});

test('progress details are keyboard reachable inside the drawer',async({page})=>{
  await seed(page,'2026-12-01T12:00:00Z');await page.goto('/app/goals?goal=quality-goal');
  const drawer=page.getByRole('dialog',{name:'Goal details'});
  const disclosure=drawer.locator('summary').filter({hasText:'Progress details'});
  await expect(disclosure).toBeVisible();
  for(let step=0;step<25&&!await disclosure.evaluate(element=>element===document.activeElement);step++)await page.keyboard.press('Tab');
  await expect(disclosure).toBeFocused();await page.keyboard.press('Enter');
  await expect(drawer.getByText('Required pace',{exact:true})).toBeVisible();
  await expect(drawer.getByText('Current pace',{exact:true})).toBeVisible();
});

test('a recovered draft can be discarded while goal details are still loading',async({page})=>{
  const goal=await seed(page);
  let release:()=>void=()=>{};
  const pending=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/v1/goals/quality-goal',async route=>{await pending;await route.fulfill({json:goal});});
  await page.addInitScript(()=>sessionStorage.setItem('krama.goal.draft.v1.quality-user.quality-workspace.quality-goal',JSON.stringify({schema:1,draftVersion:1,activeTab:'edit',note:'',progressInput:20,measurableInput:'',editTitle:'Recovered work',editIcon:'Target',editWhy:'',editCategory:'learning',editTargetDate:'',editProgressMode:'manual',settingsDirty:true,checkInDirty:false})));
  try {
    await page.goto('/app/goals?goal=quality-goal');
    const drawer=page.getByRole('dialog',{name:'Goal details'});
    await expect(drawer.getByText('Loading goal details...',{exact:true})).toBeVisible();
    await drawer.getByRole('button',{name:'Close goal details'}).click();
    const confirmation=page.getByRole('alertdialog',{name:'Discard unsaved changes?'});
    await confirmation.getByRole('button',{name:'Discard changes'}).click();
    await expect(drawer).toBeHidden();
    expect(await page.evaluate(()=>sessionStorage.getItem('krama.goal.draft.v1.quality-user.quality-workspace.quality-goal'))).toBeNull();
  } finally { release();await page.unrouteAll({behavior:'wait'}); }
});

for(const status of ['COMPLETED','PAUSED','CANCELED'] as const)for(const targetDate of [undefined,'2026-10-01T12:00:00Z'])test(`goal progress describes ${status} correctly ${targetDate ? 'with a past target' : 'without a target'}`,async({page})=>{
  await seed(page,targetDate,status);await page.goto('/app/goals?goal=quality-goal');
  const progress=page.getByRole('region',{name:'Goal progress',exact:true});
  await expect(progress.getByText({COMPLETED:'Completed',PAUSED:'Paused',CANCELED:'Canceled'}[status]!,{exact:true})).toBeVisible();
  await expect(progress.getByText('Overdue',{exact:true})).toHaveCount(0);
});
