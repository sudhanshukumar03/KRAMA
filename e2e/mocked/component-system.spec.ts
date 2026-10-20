import { test, expect } from '@playwright/test';

for(const theme of ['light','dark'])test(`shared controls expose labels, pending state and safe confirmation in ${theme}`,async({page},info)=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(theme=>localStorage.setItem('krama-theme',theme),theme);
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/quality.html');
  const field=page.getByLabel('Goal title',{exact:true});await expect(field).toHaveValue('A goal with a clear next step');
  await page.getByText('Goal title',{exact:true}).click();await expect(field).toBeFocused();
  const invalid=page.getByLabel('Required title',{exact:true});await expect(invalid).toHaveAttribute('aria-invalid','true');await expect(invalid).toHaveAccessibleDescription('Enter a title before saving.');
  const pending=page.getByRole('button',{name:'Saving changes',exact:true});await expect(pending).toBeDisabled();await expect(pending).toHaveAttribute('aria-busy','true');
  const opener=page.getByRole('button',{name:'Review discard confirmation'});await opener.click();
  const dialog=page.getByRole('alertdialog',{name:'Discard unsaved changes?'});
  const safe=dialog.getByRole('button',{name:'Keep editing'});const discard=dialog.getByRole('button',{name:'Discard changes'});
  await expect(safe).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(discard).toBeFocused();await page.keyboard.press('Tab');await expect(safe).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();await expect(page.getByRole('status')).toHaveText('Draft retained.');
  await opener.click();await discard.click();await expect(page.getByRole('status')).toHaveText('Changes discarded.');await expect(opener).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await info.attach(`components-${theme}`,{body:await page.screenshot(),contentType:'image/png'});
});
