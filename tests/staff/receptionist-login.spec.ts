/**
 * Test Suite: Staff Receptionist Portal Login Flow
 * Covers: Receptionist portal authentication, unauthenticated redirection,
 * entering receptionist credentials, and verifying navigation to the Receptionist Portal.
 */
import { test, expect } from '@playwright/test';

test.describe('Staff Receptionist Portal Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/staff/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('should render staff login page with work username and password inputs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Staff Sign In', exact: true })).toBeVisible();
    await expect(page.locator('#staff-identifier')).toBeVisible();
    await expect(page.locator('#staff-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In to Portal' })).toBeVisible();
  });

  test('should redirect unauthenticated access on /receptionist to /staff/login', async ({ page }) => {
    await page.goto('/receptionist');
    await expect(page).toHaveURL(/\/staff\/login/);
  });

  test('should successfully log in as Receptionist and navigate to Receptionist Portal', async ({ page }) => {
    // Intercept staff login endpoint
    await page.route('**/api/staff/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          staff: {
            id: 'rec-101',
            name: 'Emily Watson',
            email: 'receptionist@carepulse.com',
            role: 'receptionist',
            department: 'Front Desk',
          },
          token: 'token-rec-session',
        }),
      });
    });

    await page.locator('#staff-identifier').fill('emma.davis');
    await page.locator('#staff-password').fill('Password@123');
    await page.getByRole('button', { name: 'Sign In to Portal' }).click();

    // Verify navigation into the Receptionist Portal
    await expect(page).toHaveURL(/\/receptionist/);
    await expect(page.getByRole('button', { name: 'Token Queue' }).first()).toBeVisible();
  });
});
