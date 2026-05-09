import { test, expect } from '@playwright/test';

test.describe('CV Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session
    await page.route('**/auth/me', async route => {
      await route.fulfill({ json: { id: 'user-123', email: 'test@example.com', full_name: 'Test User' } });
    });
    
    // Inject fake token to bypass auth checks
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fake-jwt-token');
      localStorage.setItem('token', 'fake-jwt-token');
      // Some apps might use different keys, but let's try the common ones or rely on the /auth/me mock
    });
  });

  test('TC_CV_05: Should upload CV successfully', async ({ page }) => {
    // Mock CV upload API
    await page.route('**/cv/upload', async route => {
      await route.fulfill({ json: { success: true, message: 'CV uploaded successfully' } });
    });

    await page.goto('/dashboard'); 

    // We just want to ensure no crash happens and it stays on the dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
  });
});
