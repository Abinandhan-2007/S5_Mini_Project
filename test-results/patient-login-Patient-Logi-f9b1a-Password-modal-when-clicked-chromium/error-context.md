# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: patient\login.spec.ts >> Patient Login Screen >> should open Forgot Password modal when clicked
- Location: tests\patient\login.spec.ts:51:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Reset Password|Forgot Password/i)
Expected: visible
Error: strict mode violation: getByText(/Reset Password|Forgot Password/i) resolved to 2 elements:
    1) <button type="button" class="text-[11px] font-bold text-[#0B5A54] hover:underline cursor-pointer">Forgot Password?</button> aka getByRole('button', { name: 'Forgot Password?' })
    2) <h2 class="text-lg font-extrabold font-heading text-[#111827]">Reset Password</h2> aka getByRole('heading', { name: 'Reset Password' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/Reset Password|Forgot Password/i)

```

# Page snapshot

```yaml
- generic [ref=f1e6]:
  - generic [ref=f1e7]:
    - generic [ref=f1e12]:
      - heading "CarePulse" [level=1] [ref=f1e13]
      - paragraph [ref=f1e14]: Empathetic healthcare at your fingertips
    - generic [ref=f1e15]:
      - generic [ref=f1e16]:
        - heading "Welcome back" [level=2] [ref=f1e17]
        - paragraph [ref=f1e18]: Log in to manage appointments & health records
      - generic [ref=f1e19]:
        - generic [ref=f1e21]:
          - generic [ref=f1e22]: USERNAME, EMAIL, OR PHONE
          - textbox "USERNAME, EMAIL, OR PHONE" [ref=f1e24]:
            - /placeholder: Enter username, email, or phone number
        - generic [ref=f1e25]:
          - generic [ref=f1e26]:
            - generic [ref=f1e27]: PASSWORD
            - button "Forgot Password?" [ref=f1e28] [cursor=pointer]
          - generic [ref=f1e30]:
            - textbox "Enter password" [ref=f1e31]
            - button [ref=f1e32] [cursor=pointer]
        - button "LOGIN" [ref=f1e36] [cursor=pointer]
        - generic [ref=f1e41]: OR
        - button "Continue with Google" [ref=f1e45] [cursor=pointer]
    - paragraph [ref=f1e54]:
      - text: New user?
      - button "Sign Up" [ref=f1e55] [cursor=pointer]
  - generic [ref=f1e61]:
    - button [ref=f1e62] [cursor=pointer]
    - generic [ref=f1e72]:
      - heading "Reset Password" [level=2] [ref=f1e73]
      - paragraph [ref=f1e74]: Enter your username or email to receive a verification code
    - generic [ref=f1e79]:
      - generic [ref=f1e80]:
        - generic [ref=f1e81]:
          - generic [ref=f1e82]: USERNAME OR REGISTERED EMAIL
          - textbox "USERNAME OR REGISTERED EMAIL" [active] [ref=f1e84]:
            - /placeholder: e.g. Sarah Jenkins or sarah.j@carepulse.com
        - paragraph [ref=f1e85]: We will look up your account in the database and send a 6-digit OTP code to your registered email.
      - generic [ref=f1e86]: OTP delivery is secured via registered Email address only.
      - button "Fetch Account & Send OTP →" [ref=f1e91] [cursor=pointer]
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
  20 |     // Assert branding and header text
  21 |     await expect(page.getByRole('heading', { name: 'CarePulse', exact: false })).toBeVisible();
  22 |     await expect(page.getByText('Welcome back')).toBeVisible();
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
  35 |     // Attempt submitting without entering credentials
  36 |     const loginButton = page.getByRole('button', { name: 'LOGIN' });
  37 |     await loginButton.click();
  38 | 
  39 |     // The primary identifier input has standard HTML5 'required' validation,
  40 |     // so submitting when empty prevents submission or triggers form validation.
  41 |     const identifierInput = page.getByPlaceholder('Enter username, email, or phone number');
  42 |     await expect(identifierInput).toBeVisible();
  43 |   });
  44 | 
  45 |   test('should navigate to sign up page when clicking Sign Up', async ({ page }) => {
  46 |     await page.getByRole('button', { name: 'Sign Up' }).click();
  47 |     await expect(page).toHaveURL(/\/register/);
  48 |     await expect(page.getByText('Tell us more about yourself')).toBeVisible();
  49 |   });
  50 | 
  51 |   test('should open Forgot Password modal when clicked', async ({ page }) => {
  52 |     await page.getByRole('button', { name: 'Forgot Password?' }).click();
> 53 |     await expect(page.getByText(/Reset Password|Forgot Password/i)).toBeVisible();
     |                                                                     ^ Error: expect(locator).toBeVisible() failed
  54 |   });
  55 | 
  56 |   test('should navigate to home dashboard on successful credentials login', async ({ page }) => {
  57 |     // Intercept backend login API and mock successful user authentication
  58 |     await page.route('**/api/auth/login', async (route) => {
  59 |       await route.fulfill({
  60 |         status: 200,
  61 |         contentType: 'application/json',
  62 |         body: JSON.stringify({
  63 |           success: true,
  64 |           user: {
  65 |             id: 'mock-user-1',
  66 |             fullName: 'Sarah Jenkins',
  67 |             email: 'sarah@example.com',
  68 |             phone: '+91 98765 43210',
  69 |             dob: '1992-05-14',
  70 |             gender: 'Female',
  71 |             bloodGroup: 'O+',
  72 |           },
  73 |           token: 'mock-jwt-auth-token-12345',
  74 |         }),
  75 |       });
  76 |     });
  77 | 
  78 |     await page.getByPlaceholder('Enter username, email, or phone number').fill('sarah@example.com');
  79 |     await page.getByPlaceholder('Enter password').fill('password123');
  80 |     await page.getByRole('button', { name: 'LOGIN' }).click();
  81 | 
  82 |     // Verify redirection to home screen
  83 |     await expect(page).toHaveURL(/\/home/);
  84 |   });
  85 | });
  86 | 
```