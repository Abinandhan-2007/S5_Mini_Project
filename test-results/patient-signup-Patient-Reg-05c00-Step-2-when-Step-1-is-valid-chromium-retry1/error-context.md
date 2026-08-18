# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: patient\signup.spec.ts >> Patient Registration Screen >> should navigate to Step 2 when Step 1 is valid
- Location: tests\patient\signup.spec.ts:37:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder('Enter phone number')
Expected: visible
Error: strict mode violation: getByPlaceholder('Enter phone number') resolved to 2 elements:
    1) <input type="text" name="phone" id="phone-number" placeholder="Enter phone number" class="w-full bg-white border text-[#111827] text-xs sm:text-sm font-medium rounded-xl transition-all duration-150 placeholder:text-xs placeholder:font-normal placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] shadow-2xs pl-10 pr-3.5 py-2.5 border-[#E4E7EC]"/> aka getByRole('textbox', { name: 'PHONE NUMBER' })
    2) <input type="text" id="contact-phone" name="emergencyPhone" placeholder="Enter phone number" class="w-full bg-white border text-[#111827] text-xs sm:text-sm font-medium rounded-xl transition-all duration-150 placeholder:text-xs placeholder:font-normal placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#0B5A54]/20 focus:border-[#0B5A54] shadow-2xs pl-10 pr-3.5 py-2.5 border-[#E4E7EC]"/> aka getByRole('textbox', { name: 'CONTACT PHONE' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByPlaceholder('Enter phone number')

```

# Page snapshot

```yaml
- generic [ref=f1e7]:
  - generic [ref=f1e8]:
    - generic [ref=f1e9] [cursor=pointer]: CarePulse
    - generic [ref=f1e14]: REGISTRATION
  - generic [ref=f1e15]:
    - heading "Tell us more about yourself" [level=1] [ref=f1e16]
    - paragraph [ref=f1e17]: We use this information to customize your medical records and care.
  - generic [ref=f1e19]:
    - generic [ref=f1e20]:
      - text: "Step 2 of 2:"
      - strong [ref=f1e21]: Contact & Medical Details
    - generic [ref=f1e22]: 100%
  - generic [ref=f1e26]:
    - generic [ref=f1e27]:
      - heading "Contact & Emergency" [level=2] [ref=f1e31]
      - generic [ref=f1e32]:
        - generic [ref=f1e33]:
          - generic [ref=f1e34]: PHONE NUMBER
          - textbox "PHONE NUMBER" [ref=f1e36]:
            - /placeholder: Enter phone number
        - generic [ref=f1e37]:
          - generic [ref=f1e38]: EMAIL ADDRESS
          - textbox "EMAIL ADDRESS" [ref=f1e40]:
            - /placeholder: Enter email address
        - generic [ref=f1e41]:
          - generic [ref=f1e42]: RESIDENTIAL ADDRESS
          - textbox "RESIDENTIAL ADDRESS" [ref=f1e44]:
            - /placeholder: Enter complete address
        - generic [ref=f1e45]:
          - generic [ref=f1e46]: EMERGENCY CONTACT
          - generic [ref=f1e50]:
            - generic [ref=f1e51]: CONTACT NAME
            - textbox "CONTACT NAME" [ref=f1e53]:
              - /placeholder: Enter relative or spouse name
          - generic [ref=f1e54]:
            - generic [ref=f1e55]: CONTACT PHONE
            - textbox "CONTACT PHONE" [ref=f1e57]:
              - /placeholder: Enter phone number
          - paragraph [ref=f1e58]: Relationship and contact info required for emergency response.
    - generic [ref=f1e59]:
      - button "Back" [ref=f1e60] [cursor=pointer]
      - button "Create Profile →" [ref=f1e65] [cursor=pointer]
  - paragraph [ref=f1e71]:
    - text: Already have an account?
    - button "Log in" [ref=f1e72] [cursor=pointer]
```

# Test source

```ts
  1  | /**
  2  |  * Test Suite: Patient Registration (Sign Up) Flow
  3  |  * Covers: Multi-step registration form (Step 1 Basic Info, Step 2 Contact Details),
  4  |  * validation rules, and submitting to navigate to the Home dashboard.
  5  |  */
  6  | import { test, expect } from '@playwright/test';
  7  | 
  8  | test.describe('Patient Registration Screen', () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto('/register');
  11 |     await page.evaluate(() => {
  12 |       localStorage.clear();
  13 |       sessionStorage.clear();
  14 |     });
  15 |     await page.reload();
  16 |   });
  17 | 
  18 |   test('should render Step 1 form elements correctly', async ({ page }) => {
  19 |     await expect(page.getByText('Tell us more about yourself')).toBeVisible();
  20 |     await expect(page.getByText('Personal Details')).toBeVisible();
  21 | 
  22 |     await expect(page.getByPlaceholder('Enter full name')).toBeVisible();
  23 |     await expect(page.getByPlaceholder('Create password (min. 6 characters)')).toBeVisible();
  24 |     await expect(page.getByPlaceholder('Re-enter your password')).toBeVisible();
  25 |     await expect(page.locator('input[type="date"]')).toBeVisible();
  26 |     await expect(page.getByRole('button', { name: 'Next Step →' })).toBeVisible();
  27 |   });
  28 | 
  29 |   test('should validate required fields in Step 1 before proceeding', async ({ page }) => {
  30 |     // Attempt clicking Next Step without filling fields
  31 |     await page.getByRole('button', { name: 'Next Step →' }).click();
  32 | 
  33 |     // Expect validation error messages
  34 |     await expect(page.getByText('Full name is required')).toBeVisible();
  35 |   });
  36 | 
  37 |   test('should navigate to Step 2 when Step 1 is valid', async ({ page }) => {
  38 |     await page.getByPlaceholder('Enter full name').fill('John Doe');
  39 |     await page.getByPlaceholder('Create password (min. 6 characters)').fill('Password123');
  40 |     await page.getByPlaceholder('Re-enter your password').fill('Password123');
  41 |     await page.locator('input[type="date"]').fill('1995-08-15');
  42 | 
  43 |     await page.getByRole('button', { name: 'Next Step →' }).click();
  44 | 
  45 |     // Verify Step 2 header
  46 |     await expect(page.getByText('Contact & Emergency')).toBeVisible();
> 47 |     await expect(page.getByPlaceholder('Enter phone number')).toBeVisible();
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  48 |     await expect(page.getByPlaceholder('Enter email address')).toBeVisible();
  49 |     await expect(page.getByPlaceholder('Enter complete address')).toBeVisible();
  50 |     await expect(page.getByRole('button', { name: 'Create Profile →' })).toBeVisible();
  51 |   });
  52 | 
  53 |   test('should complete 2-step registration and navigate to home', async ({ page }) => {
  54 |     // Intercept backend registration API
  55 |     await page.route('**/api/auth/register', async (route) => {
  56 |       await route.fulfill({
  57 |         status: 200,
  58 |         contentType: 'application/json',
  59 |         body: JSON.stringify({
  60 |           success: true,
  61 |           user: {
  62 |             id: 'mock-reg-user-1',
  63 |             fullName: 'Jane Smith',
  64 |             email: 'janesmith@carepulse.test',
  65 |             phone: '+91 91234 56780',
  66 |             dob: '1996-03-20',
  67 |             gender: 'Female',
  68 |             bloodGroup: 'O+',
  69 |             address: '123 Health Ave, Metro City',
  70 |           },
  71 |           token: 'mock-reg-jwt-token',
  72 |         }),
  73 |       });
  74 |     });
  75 | 
  76 |     // Step 1: Fill Basic Information
  77 |     await page.getByPlaceholder('Enter full name').fill('Jane Smith');
  78 |     await page.getByPlaceholder('Create password (min. 6 characters)').fill('SecurePass123');
  79 |     await page.getByPlaceholder('Re-enter your password').fill('SecurePass123');
  80 |     await page.locator('input[type="date"]').fill('1996-03-20');
  81 |     await page.getByRole('button', { name: 'Next Step →' }).click();
  82 | 
  83 |     // Step 2: Fill Contact & Address
  84 |     await expect(page.getByText('Contact & Emergency')).toBeVisible();
  85 |     await page.getByPlaceholder('Enter phone number').fill('+91 91234 56780');
  86 |     await page.getByPlaceholder('Enter email address').fill('janesmith@carepulse.test');
  87 |     await page.getByPlaceholder('Enter complete address').fill('123 Health Ave, Metro City');
  88 | 
  89 |     await page.getByRole('button', { name: 'Create Profile →' }).click();
  90 | 
  91 |     // Should successfully land on Home page
  92 |     await expect(page).toHaveURL(/\/home/);
  93 |   });
  94 | });
  95 | 
```