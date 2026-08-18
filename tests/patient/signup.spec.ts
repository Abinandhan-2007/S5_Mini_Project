/**
 * Test Suite: Patient Registration (Sign Up) Flow
 * Covers: Multi-step registration form (Step 1 Basic Info, Step 2 Contact Details),
 * validation rules, and submitting to navigate to the Home dashboard.
 */
import { test, expect } from '@playwright/test';

test.describe('Patient Registration Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('should render Step 1 form elements correctly', async ({ page }) => {
    await expect(page.getByText('Tell us more about yourself')).toBeVisible();
    await expect(page.getByText('Personal Details')).toBeVisible();

    await expect(page.getByPlaceholder('Enter full name')).toBeVisible();
    await expect(page.getByPlaceholder('Create password (min. 6 characters)')).toBeVisible();
    await expect(page.getByPlaceholder('Re-enter your password')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next Step →' })).toBeVisible();
  });

  test('should validate required fields in Step 1 before proceeding', async ({ page }) => {
    // Attempt clicking Next Step without filling fields
    await page.getByRole('button', { name: 'Next Step →' }).click();

    // Expect validation error messages
    await expect(page.getByText('Full name is required')).toBeVisible();
  });

  test('should navigate to Step 2 when Step 1 is valid', async ({ page }) => {
    await page.getByPlaceholder('Enter full name').fill('John Doe');
    await page.getByPlaceholder('Create password (min. 6 characters)').fill('Password123');
    await page.getByPlaceholder('Re-enter your password').fill('Password123');
    await page.locator('input[type="date"]').fill('1995-08-15');

    await page.getByRole('button', { name: 'Next Step →' }).click();

    // Verify Step 2 header
    await expect(page.getByText('Contact & Emergency')).toBeVisible();
    await expect(page.getByPlaceholder('Enter phone number')).toBeVisible();
    await expect(page.getByPlaceholder('Enter email address')).toBeVisible();
    await expect(page.getByPlaceholder('Enter complete address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Profile →' })).toBeVisible();
  });

  test('should complete 2-step registration and navigate to home', async ({ page }) => {
    // Intercept backend registration API
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'mock-reg-user-1',
            fullName: 'Jane Smith',
            email: 'janesmith@carepulse.test',
            phone: '+91 91234 56780',
            dob: '1996-03-20',
            gender: 'Female',
            bloodGroup: 'O+',
            address: '123 Health Ave, Metro City',
          },
          token: 'mock-reg-jwt-token',
        }),
      });
    });

    // Step 1: Fill Basic Information
    await page.getByPlaceholder('Enter full name').fill('Jane Smith');
    await page.getByPlaceholder('Create password (min. 6 characters)').fill('SecurePass123');
    await page.getByPlaceholder('Re-enter your password').fill('SecurePass123');
    await page.locator('input[type="date"]').fill('1996-03-20');
    await page.getByRole('button', { name: 'Next Step →' }).click();

    // Step 2: Fill Contact & Address
    await expect(page.getByText('Contact & Emergency')).toBeVisible();
    await page.getByPlaceholder('Enter phone number').fill('+91 91234 56780');
    await page.getByPlaceholder('Enter email address').fill('janesmith@carepulse.test');
    await page.getByPlaceholder('Enter complete address').fill('123 Health Ave, Metro City');

    await page.getByRole('button', { name: 'Create Profile →' }).click();

    // Should successfully land on Home page
    await expect(page).toHaveURL(/\/home/);
  });
});
