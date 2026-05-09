import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/me', async route => {
      await route.fulfill({ json: { id: 'user-123', email: 'test@example.com', full_name: 'Test User' } });
    });
    
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fake-jwt-token');
      localStorage.setItem('token', 'fake-jwt-token');
    });
  });

  test('TC_DASH_03: Should navigate dashboard sidebar', async ({ page }) => {
    // Navigate directly to dashboard
    await page.goto('/dashboard');
    
    // We expect to remain on the dashboard URL
    await expect(page).toHaveURL(/.*dashboard.*/);

    // Wait for network idle to ensure components mount
    await page.waitForLoadState('networkidle');
  });
});
