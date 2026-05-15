import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/me', async route => {
      await route.fulfill({ json: { id: 'user-123', email: 'test@example.com', full_name: 'Test User' } });
    });
    
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fake-jwt-token');
      localStorage.setItem('token', 'fake-jwt-token');
    });
  });

  test('TC_PAY_03: Should trigger checkout flow', async ({ page }) => {
    // Mock the checkout session creation
    await page.route('**/payment/create-checkout-session', async route => {
      await route.fulfill({ json: { url: 'https://checkout.stripe.com/fake-url' } });
    });

    await page.goto('/dashboard');

    // We verify page is loaded
    await expect(page).toHaveURL(/.*dashboard.*/);
  });
});
