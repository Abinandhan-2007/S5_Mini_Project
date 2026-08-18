/**
 * Test Suite: Staff Admin Portal Login Flow
 * Covers: Staff portal login rendering, auth guard redirect for /admin,
 * entering admin credentials, and verifying navigation to the Admin Dashboard.
 */
import { test, expect } from '@playwright/test';

test.describe('Staff Admin Portal Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/staff/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('should render staff login page with correct layout and security branding', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'CarePulse', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByText('Enter your work credentials to access your portal.')).toBeVisible();
    await expect(page.locator('#staff-email')).toBeVisible();
    await expect(page.locator('#staff-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should redirect unauthenticated access on /admin to /staff/login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/staff\/login/);
  });

  test('should successfully log in as Admin and navigate to Admin Command Center', async ({ page }) => {
    // Intercept staff login endpoint (or test static fallback)
    await page.route('**/api/staff/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          staff: {
            id: 'admin-1',
            name: 'Dr. Arthur Vance',
            email: 'admin@carepulse.com',
            role: 'admin',
            department: 'Chief Medical Administration',
          },
          token: 'token-admin-session',
        }),
      });
    });

    await page.locator('#staff-email').fill('admin@carepulse.com');
    await page.locator('#staff-password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify navigation into the Admin Portal
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Dashboard', { exact: true })).toBeVisible();
  });
});
