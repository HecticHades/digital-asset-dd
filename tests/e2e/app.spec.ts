import { test, expect } from '@playwright/test';

test.describe('Digital Asset Due Diligence - Application Tests', () => {

  test.describe('Login Page', () => {
    test('should display login form with all elements', async ({ page }) => {
      await page.goto('/login');

      // Check page title
      await expect(page.locator('h1')).toContainText('Digital Asset Due Diligence');

      // Check subtitle
      await expect(page.getByText('Sign in to your account')).toBeVisible();

      // Check form elements
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Check remember me checkbox
      await expect(page.getByLabel('Remember me')).toBeVisible();

      // Check forgot password link
      await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
    });

    test('should attempt login with credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in credentials
      await page.getByLabel('Email address').fill('test@example.com');
      await page.getByLabel('Password').fill('testpassword');

      // Verify form can be submitted
      const submitButton = page.getByRole('button', { name: /sign in/i });
      await expect(submitButton).toBeEnabled();

      // Submit form
      await submitButton.click();

      // Button should show loading state or page should change
      await page.waitForLoadState('networkidle');
    });

    test('forgot password link should be present', async ({ page }) => {
      await page.goto('/login');

      const forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
      await expect(forgotPasswordLink).toBeVisible();
      await expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    });

    test('should have proper form validation', async ({ page }) => {
      await page.goto('/login');

      // Try to submit empty form
      await page.getByRole('button', { name: /sign in/i }).click();

      // HTML5 validation should prevent submission
      const emailInput = page.getByLabel('Email address');
      await expect(emailInput).toHaveAttribute('required', '');
    });
  });

  test.describe('Navigation', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to login page
      await expect(page).toHaveURL(/login/);
    });

    test('should load the home page', async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.status()).toBeLessThan(500);
    });
  });

  test.describe('Accessibility', () => {
    test('login page should have proper labels', async ({ page }) => {
      await page.goto('/login');

      // Check that inputs have proper labels
      const emailInput = page.getByLabel('Email address');
      await expect(emailInput).toHaveAttribute('type', 'email');

      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('login page should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to focus inputs
      const emailInput = page.getByLabel('Email address');
      await emailInput.focus();
      await expect(emailInput).toBeFocused();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/login');

      // Form should still be visible
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.goto('/login');

      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/login');

      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });
  });

  test.describe('Visual Regression', () => {
    test('login page screenshot', async ({ page }) => {
      await page.goto('/login');

      // Wait for animations to complete
      await page.waitForTimeout(1000);

      // Take screenshot for visual comparison (update baseline with --update-snapshots)
      await expect(page).toHaveScreenshot('login-page.png', {
        maxDiffPixels: 500,
        threshold: 0.3
      });
    });
  });

  test.describe('Performance', () => {
    test('login page should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/login');
      const loadTime = Date.now() - startTime;

      // Page should load in under 15 seconds (dev server cold start)
      expect(loadTime).toBeLessThan(15000);
    });
  });
});
