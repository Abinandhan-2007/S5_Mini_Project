/**
 * Test Suite: Patient Login Flow
 * Covers: Login page elements, credential inputs, Google OAuth button,
 * empty validation handling, and mock successful login navigation.
 */
import { test, expect } from '@playwright/test';

test.describe('Patient Login Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test for clean session state
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('should render the login screen with expected elements', async ({ page }) => {
    // Wait for login form to be visible after initial splash screen animation finishes
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Log in to manage appointments & health records')).toBeVisible();

    // Assert inputs and action buttons
    await expect(page.getByPlaceholder('Enter username, email, or phone number')).toBeVisible();
    await expect(page.getByPlaceholder('Enter password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Forgot Password?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  });

  test('should handle empty or invalid credential submissions gracefully', async ({ page }) => {
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 15000 });

    // Attempt submitting without entering credentials
    const loginButton = page.getByRole('button', { name: 'LOGIN' });
    await loginButton.click();

    // The primary identifier input has standard HTML5 'required' validation,
    // so submitting when empty prevents submission or triggers form validation.
    const identifierInput = page.getByPlaceholder('Enter username, email, or phone number');
    await expect(identifierInput).toBeVisible();
  });

  test('should navigate to sign up page when clicking Sign Up', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText('Tell us more about yourself')).toBeVisible();
  });

  test('should open Forgot Password modal when clicked', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Forgot Password?' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Forgot Password?' }).click();
    // Specifically target the modal heading only to prevent ambiguity with the trigger button
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
  });

  test('should navigate to home dashboard on successful credentials login', async ({ page }) => {
    // Intercept backend login API and mock successful user authentication
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'mock-user-1',
            fullName: 'Sarah Jenkins',
            email: 'sarah@example.com',
            phone: '+91 98765 43210',
            dob: '1992-05-14',
            gender: 'Female',
            bloodGroup: 'O+',
          },
          token: 'mock-jwt-auth-token-12345',
        }),
      });
    });

    await expect(page.getByPlaceholder('Enter username, email, or phone number')).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder('Enter username, email, or phone number').fill('sarah@example.com');
    await page.getByPlaceholder('Enter password').fill('password123');
    await page.getByRole('button', { name: 'LOGIN' }).click();

    // Verify redirection to home screen
    await expect(page).toHaveURL(/\/home/);
  });
});
