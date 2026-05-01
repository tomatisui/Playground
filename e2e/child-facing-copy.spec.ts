import { test, expect } from '@playwright/test';

test('home page loads and exposes expected entry buttons', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await expect(page.locator('body')).toBeVisible();

  await expect(page.getByText('보호자 흐름 시작')).toBeVisible();
});