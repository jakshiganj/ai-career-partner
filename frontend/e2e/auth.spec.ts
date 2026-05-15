import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('TC_AUTH_07: Should login successfully and redirect to dashboard', async ({ page }) => {
    // Mock the login API request
    await page.route('**/auth/login', async route => {
      const json = { access_token: 'fake-jwt-token', token_type: 'bearer' };
      await route.fulfill({ json });
    });

    // Mock the user profile API request that usually happens after login
    await page.route('**/auth/me', async route => {
      const json = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
      };
      await route.fulfill({ json });
    });

    await page.goto('/login');

    // Fill in the login form
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');

    // Click submit
    await page.locator('button[type="submit"]').click();

    // Verify redirection to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
  });
});
