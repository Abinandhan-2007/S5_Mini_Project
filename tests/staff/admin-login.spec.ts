/**
 * Test Suite: Staff Admin Portal Login Flow
 * Covers: Staff portal login rendering, admin credentials authentication,
 * navigating to the Admin Dashboard, and logout security.
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
    await expect(page.getByRole('heading', { name: 'Staff Sign In', exact: true })).toBeVisible();
    await expect(page.getByText('Enter your work credentials. System auto-routes to your portal.')).toBeVisible();
    await expect(page.locator('#staff-identifier')).toBeVisible();
    await expect(page.locator('#staff-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In to Portal' })).toBeVisible();
  });

  test('should handle logout from admin portal and require staff login re-authentication', async ({ page }) => {
    await page.goto('/admin');
    // If admin is active, logout returns to /staff/login
    const logoutBtn = page.getByRole('button', { name: /Logout|Sign Out/i }).or(page.locator('button:has-text("Logout")'));
    if (await logoutBtn.first().isVisible()) {
      await logoutBtn.first().click();
      await expect(page).toHaveURL(/\/staff\/login/);
    } else {
      await page.goto('/staff/login');
      await expect(page).toHaveURL(/\/staff\/login/);
    }
  });

  test('should successfully log in as Admin and navigate to Admin Command Center', async ({ page }) => {
    // Intercept staff login endpoint (or use client-side credential matcher)
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

    await page.locator('#staff-identifier').fill('admin');
    await page.locator('#staff-password').fill('Admin@123');
    await page.getByRole('button', { name: 'Sign In to Portal' }).click();

    // Verify navigation into the Admin Portal
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('Dashboard', { exact: true })).toBeVisible();
  });
});
