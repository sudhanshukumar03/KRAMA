import { test, expect } from '@playwright/test';

test('verify drag and drop and dependencies', async ({ page }) => {
  // 1. Sign up a new user
  const uniqueId = Date.now();
  console.log(`Navigating to /signup for user test${uniqueId}@test.com`);
  await page.goto('http://localhost:5173/signup');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="text"], input[name="name"]', `Test User`);
  await page.fill('input[type="email"]', `test${uniqueId}@test.com`);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000); // Wait for API and redirect
  
  // 2. We might be on onboarding or dashboard. Let's create a project if needed.
  console.log("Navigating to /app/projects (or trying to create a project)...");
  await page.goto('http://localhost:5173/app/projects');
  await page.waitForLoadState('networkidle');
  
  // Check if there's a "New Project" button
  const newProjBtn = page.locator('button:has-text("New Project"), button:has-text("Create Project")');
  if (await newProjBtn.count() > 0) {
    await newProjBtn.first().click();
    await page.fill('input[placeholder*="title"], input[name="name"]', 'Test Project');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  console.log("Navigating to Kanban...");
  await page.goto('http://localhost:5173/app/board');
  await page.waitForLoadState('networkidle');

  // Wait for the Kanban board to render cards or columns
  await page.waitForTimeout(2000); 

  const cards = page.locator('[draggable="true"]');
  let count = await cards.count();
  console.log(`Found ${count} draggable cards initially.`);

  if (count < 3) {
    console.log("Creating 3 tasks for testing...");
    for (let i = 1; i <= 3; i++) {
      const newBtn = page.locator('button:has-text("New Task"), button:has-text("New Issue")');
      if (await newBtn.count() > 0) {
        await newBtn.first().click();
        await page.waitForTimeout(500);
        await page.fill('input[placeholder*="title"], input[placeholder*="e.g."]', `Test Task ${i}`);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
      } else {
        console.log("Could not find New Directive button!");
      }
    }
  }

  // Refresh to make sure order is natural
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  count = await cards.count();
  console.log(`Found ${count} draggable cards before drag.`);

  let beforeTexts = [];
  for(let i = 0; i < Math.min(count, 3); i++) {
    const text = await cards.nth(i).innerText();
    beforeTexts.push(text.split('\n')[0]);
  }
  console.log("Card order before drag:", beforeTexts);

  if (count >= 3) {
    console.log("Dragging Card 1 to Card 3 position...");
    const source = cards.nth(0);
    const target = cards.nth(2);
    
    await source.hover();
    await page.mouse.down();
    
    const targetBox = await target.boundingBox();
    if (targetBox) {
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 });
    }
    await page.mouse.up();
    
    await page.waitForTimeout(2000); 

    let afterTexts = [];
    for(let i = 0; i < Math.min(count, 3); i++) {
      const text = await cards.nth(i).innerText();
      afterTexts.push(text.split('\n')[0]);
    }
    console.log("Card order after drag:", afterTexts);

    console.log("Refreshing page...");
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const refreshedCards = page.locator('[draggable="true"]');
    let refTexts = [];
    for(let i = 0; i < Math.min(count, 3); i++) {
      const text = await refreshedCards.nth(i).innerText();
      refTexts.push(text.split('\n')[0]);
    }
    console.log("Card order after refresh:", refTexts);
  } else {
      console.log("Not enough cards to drag. Skipping drag test.");
  }

  // Dependency Dropdown check
  console.log("Checking Dependency Dropdown...");
  const refreshedCards = page.locator('[draggable="true"]');
  if (await refreshedCards.count() > 0) {
    await refreshedCards.nth(0).click();
    await page.waitForTimeout(1000); 
    
    const select = page.locator('select').first();
    if (await select.count() > 0) {
      const options = await page.locator('select option').allTextContents();
      console.log("Dropdown options available:", options);

      const valueToSelect = await page.locator('select option').nth(1).getAttribute('value');
      console.log("Selecting option value:", valueToSelect);
      if (valueToSelect) {
        await select.selectOption(valueToSelect);
        await page.click('button[type="submit"]:has-text("Save")');
        await page.waitForTimeout(2000);
        
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        const newRefreshedCards = page.locator('[draggable="true"]');
        await newRefreshedCards.nth(0).click();
        await page.waitForTimeout(1000);
        const selectedValue = await page.locator('select').first().inputValue();
        console.log("Persisted selected value:", selectedValue);
      }
    } else {
      console.log("No select element found for dependencies.");
    }
  }
});
