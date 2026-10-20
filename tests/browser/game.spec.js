import { test, expect } from '@playwright/test';

async function enter(page) {
  await page.goto('/?test=1&quality=low');
  await page.waitForFunction(() => !!window.__game);
  await page.locator('#start').click();
  await page.waitForFunction(() => window.__game.running);
}

test('renders the harbor and supports movement, airborne shooting, slide, switching, draw and reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?test=1&quality=low');
  await expect(page.locator('h1').first()).toContainText('HARBOR');
  await page.waitForFunction(() => !!window.__game);
  await page.screenshot({ path: 'test-results/harbor-menu.png' });
  await page.locator('#start').click();
  // Isolate controls from combat randomness; actual combat is exercised below.
  await page.evaluate(() => { window.__game.enemies.forEach(e => { e.health = 0; e.group.visible = false; }); });
  const before = await page.evaluate(() => window.__game.player.group.position.z);
  await page.keyboard.down('KeyW');
  await page.waitForFunction(before => window.__game.player.group.position.z < before - 1.5, before);
  await page.keyboard.up('KeyW');
  expect(await page.evaluate(() => window.__game.player.group.position.z)).toBeLessThan(before - 1);
  await page.waitForFunction(() => window.__game.player.draw === 0);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.player.group.position.y > .5);
  await page.mouse.down();
  await page.waitForFunction(() => window.__game.shots > 0 && !window.__game.player.grounded);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__game.shots)).toBeGreaterThan(0);
  await page.waitForFunction(() => window.__game.player.grounded);
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.__game.player.slide > .1);
  const fired = await page.evaluate(() => window.__game.shots);
  await page.mouse.down();
  await page.waitForFunction(fired => window.__game.shots > fired && window.__game.player.slide > 0, fired);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__game.shots)).toBeGreaterThan(fired);
  await page.keyboard.press('Digit2');
  expect(await page.evaluate(() => window.__game.characters[0].slide)).toBe(0);
  expect(await page.evaluate(() => window.__game.characters[0].body.position.y)).toBe(0);
  await expect(page.locator('#weapon-name')).toHaveText('AR-P');
  await expect(page.locator('#weapon-status')).toContainText('DRAWING');
  await page.waitForFunction(() => window.__game.player.draw === 0);
  await page.keyboard.press('KeyQ');
  await expect(page.locator('#weapon-name')).toHaveText('GLOCK WITH SWITCH');
  await page.waitForFunction(() => window.__game.player.draw === 0);
  const sidearmShots = await page.evaluate(() => window.__game.shots);
  await page.mouse.down();
  await page.waitForFunction(before => window.__game.shots > before, sidearmShots);
  await page.mouse.up();
  await page.keyboard.press('KeyR');
  await expect(page.locator('#weapon-status')).toContainText('RELOADING');
  await expect(page.locator('#ammo')).toHaveText('30', { timeout: 10000 });
  await expect(page.locator('#spares')).toHaveText('4');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.player.group.position.y > .4);
  const oldPosition = await page.evaluate(() => ({ x: window.__game.player.group.position.x, z: window.__game.player.group.position.z }));
  await page.keyboard.press('Digit3');
  await page.waitForFunction(() => window.__game.characters[1].grounded);
  expect(await page.evaluate(() => ({ x: window.__game.characters[1].group.position.x, z: window.__game.characters[1].group.position.z }))).toEqual(oldPosition);
  expect(await page.evaluate(() => window.__game.characters[1].loadout[1].rounds[0])).toBe(30);
  await page.screenshot({ path: 'test-results/harbor-gameplay.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeVisible();
  expect(await page.evaluate(() => window.__game.running)).toBe(false);
  expect(errors).toEqual([]);
});

test('muzzle rays damage targets, respect cover, and do not snap to camera yaw', async ({ page }) => {
  await enter(page);
  const result = await page.evaluate(() => {
    const game = window.__game;
    game.running = false;
    const p = game.player;
    p.group.position.set(-.4, 0, 0);
    p.group.rotation.set(0, 0, 0);
    p.arms.rotation.set(0, 0, 0);
    p.body.position.y = 0;
    p.body.rotation.x = 0;
    p.draw = 0;
    game.yaw = Math.PI / 2;
    const target = game.enemies[0];
    target.group.position.set(0, 0, -5);
    game.enemies.slice(1).forEach(enemy => enemy.health = 0);
    const start = target.health;
    game.shoot(p);
    const damaged = target.health;
    game.box(4, 4, .5, '#666666', 0, 2, -2.5, { solid: true });
    game.shoot(p);
    return { start, damaged, covered: target.health };
  });
  expect(result.damaged).toBeLessThan(result.start);
  expect(result.covered).toBe(result.damaged);
});

test('story blocks wrong characters and completes only after all three roles', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => { window.__game.enemies.forEach(e => { e.health = 0; e.group.visible = false; }); window.__game.player.group.position.set(0, 0, -6.5); });
  await page.keyboard.press('Digit2');
  await page.evaluate(() => window.__game.player.group.position.set(0, 0, -6.5));
  await expect(page.locator('#interaction')).toContainText('SWITCH TO KING DRACO');
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(1800);
  await page.keyboard.up('KeyE');
  expect(await page.evaluate(() => window.__game.stage)).toBe(0);
  for (const [i, x, z] of [[0, 0, -6.5], [1, -13, -24.5], [2, 10, -38]]) {
    await page.keyboard.press(`Digit${i + 1}`);
    await page.evaluate(({ x, z }) => window.__game.player.group.position.set(x, 0, z), { x, z });
    await page.keyboard.down('KeyE');
    await page.waitForFunction(stage => window.__game.stage > stage, i);
    await page.keyboard.up('KeyE');
  }
  await expect(page.locator('#result-title')).toHaveText('CREWEXTRACTED.');
  expect(await page.evaluate(() => window.__game.finished)).toBe(true);
});
