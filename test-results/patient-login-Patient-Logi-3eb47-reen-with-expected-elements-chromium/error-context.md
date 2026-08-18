# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: patient\login.spec.ts >> Patient Login Screen >> should render the login screen with expected elements
- Location: tests\patient\login.spec.ts:19:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Welcome back')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Welcome back')

```

```yaml
- img
- img
- heading "CarePulse" [level=1]
- paragraph: Empathetic healthcare at your fingertips
- text: Checking connection... 29%
- paragraph: CarePulse • v1.0.0
```

# Test source

```ts
  1  | /**
  2  |  * Test Suite: Patient Login Flow
  3  |  * Covers: Login page elements, credential inputs, Google OAuth button,
  4  |  * empty validation handling, and mock successful login navigation.
  5  |  */
  6  | import { test, expect } from '@playwright/test';
  7  | 
  8  | test.describe('Patient Login Screen', () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     // Clear storage before each test for clean session state
  11 |     await page.goto('/login');
  12 |     await page.evaluate(() => {
  13 |       localStorage.clear();
  14 |       sessionStorage.clear();
  15 |     });
  16 |     await page.reload();
  17 |   });
  18 | 
  19 |   test('should render the login screen with expected elements', async ({ page }) => {
  20 |     // Wait for screen to finish initial splash animation
  21 |     await expect(page.getByRole('heading', { name: 'CarePulse', exact: false })).toBeVisible({ timeout: 10000 });
> 22 |     await expect(page.getByText('Welcome back')).toBeVisible();
     |                                                  ^ Error: expect(locator).toBeVisible() failed
  23 |     await expect(page.getByText('Log in to manage appointments & health records')).toBeVisible();
  24 | 
  25 |     // Assert inputs and action buttons
  26 |     await expect(page.getByPlaceholder('Enter username, email, or phone number')).toBeVisible();
  27 |     await expect(page.getByPlaceholder('Enter password')).toBeVisible();
  28 |     await expect(page.getByRole('button', { name: 'LOGIN' })).toBeVisible();
  29 |     await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  30 |     await expect(page.getByRole('button', { name: 'Forgot Password?' })).toBeVisible();
  31 |     await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  32 |   });
  33 | 
  34 |   test('should handle empty or invalid credential submissions gracefully', async ({ page }) => {
  35 |     // Wait for screen to finish initial splash animation
  36 |     await expect(page.getByRole('heading', { name: 'CarePulse', exact: false })).toBeVisible({ timeout: 10000 });
  37 | 
  38 |     // Attempt submitting without entering credentials
  39 |     const loginButton = page.getByRole('button', { name: 'LOGIN' });
  40 |     await loginButton.click();
  41 | 
  42 |     // The primary identifier input has standard HTML5 'required' validation,
  43 |     // so submitting when empty prevents submission or triggers form validation.
  44 |     const identifierInput = page.getByPlaceholder('Enter username, email, or phone number');
  45 |     await expect(identifierInput).toBeVisible();
  46 |   });
  47 | 
  48 |   test('should navigate to sign up page when clicking Sign Up', async ({ page }) => {
  49 |     await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible({ timeout: 10000 });
  50 |     await page.getByRole('button', { name: 'Sign Up' }).click();
  51 |     await expect(page).toHaveURL(/\/register/);
  52 |     await expect(page.getByText('Tell us more about yourself')).toBeVisible();
  53 |   });
  54 | 
  55 |   test('should open Forgot Password modal when clicked', async ({ page }) => {
  56 |     await expect(page.getByRole('button', { name: 'Forgot Password?' })).toBeVisible({ timeout: 10000 });
  57 |     await page.getByRole('button', { name: 'Forgot Password?' }).click();
  58 |     // Specifically target the modal heading only to prevent ambiguity with the trigger button
  59 |     await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
  60 |   });
  61 | 
  62 |   test('should navigate to home dashboard on successful credentials login', async ({ page }) => {
  63 |     // Intercept backend login API and mock successful user authentication
  64 |     await page.route('**/api/auth/login', async (route) => {
  65 |       await route.fulfill({
  66 |         status: 200,
  67 |         contentType: 'application/json',
  68 |         body: JSON.stringify({
  69 |           success: true,
  70 |           user: {
  71 |             id: 'mock-user-1',
  72 |             fullName: 'Sarah Jenkins',
  73 |             email: 'sarah@example.com',
  74 |             phone: '+91 98765 43210',
  75 |             dob: '1992-05-14',
  76 |             gender: 'Female',
  77 |             bloodGroup: 'O+',
  78 |           },
  79 |           token: 'mock-jwt-auth-token-12345',
  80 |         }),
  81 |       });
  82 |     });
  83 | 
  84 |     await expect(page.getByPlaceholder('Enter username, email, or phone number')).toBeVisible({ timeout: 10000 });
  85 |     await page.getByPlaceholder('Enter username, email, or phone number').fill('sarah@example.com');
  86 |     await page.getByPlaceholder('Enter password').fill('password123');
  87 |     await page.getByRole('button', { name: 'LOGIN' }).click();
  88 | 
  89 |     // Verify redirection to home screen
  90 |     await expect(page).toHaveURL(/\/home/);
  91 |   });
  92 | });
  93 | 
```