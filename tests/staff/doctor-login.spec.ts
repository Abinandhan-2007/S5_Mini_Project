/**
 * Test Suite: Staff Doctor Portal Login Flow
 * Covers: Doctor portal authentication, auth guard redirect for /doctor,
 * entering doctor credentials, and verifying navigation to the Doctor Workspace.
 */
import { test, expect } from '@playwright/test';

test.describe('Staff Doctor Portal Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/staff/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('should render staff login page with work email and password inputs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.locator('#staff-email')).toBeVisible();
    await expect(page.locator('#staff-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should redirect unauthenticated access on /doctor to /staff/login', async ({ page }) => {
    await page.goto('/doctor');
    await expect(page).toHaveURL(/\/staff\/login/);
  });

  test('should successfully log in as Doctor and navigate to Doctor Workspace', async ({ page }) => {
    // Intercept staff login endpoint
    await page.route('**/api/staff/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          staff: {
            id: 'doc-1',
            name: 'Dr. Olivia Wilson',
            email: 'doctor@carepulse.com',
            role: 'doctor',
            department: 'Cardiology',
          },
          token: 'token-doc-session',
        }),
      });
    });

    await page.locator('#staff-email').fill('doctor@carepulse.com');
    await page.locator('#staff-password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify navigation into the Doctor Portal
    await expect(page).toHaveURL(/\/doctor/);
    await expect(page.getByText('Doctor Workspace')).toBeVisible();
  });
});
