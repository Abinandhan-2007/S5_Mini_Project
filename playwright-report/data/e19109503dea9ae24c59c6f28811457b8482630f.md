# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff\doctor-login.spec.ts >> Staff Doctor Portal Login >> should successfully log in as Doctor and navigate to Doctor Workspace
- Location: tests\staff\doctor-login.spec.ts:30:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Doctor Workspace')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Doctor Workspace')

```

```yaml
- banner:
  - paragraph: CarePulse
  - paragraph: Doctor Portal
  - button
  - paragraph: Dr. Olivia Wilson
  - paragraph: Doctor
  - button "Logout"
- main:
  - paragraph: Tuesday, 18 August 2026
  - heading "Good Morning, Dr. Olivia 👋" [level=1]
  - paragraph: You have 5 patients remaining today.
  - text: Today's Schedule
  - paragraph: "6"
  - paragraph: Total Today
  - paragraph: "1"
  - paragraph: In Progress
  - paragraph: "2"
  - paragraph: Waiting
  - paragraph: "1"
  - paragraph: Completed
  - heading "Patient Queue — Today" [level=2]
  - text: 6 patients
  - button "All"
  - button "In Consultation"
  - button "Waiting"
  - button "Pending"
  - button "Done"
  - text: "#001"
  - paragraph: Sarah Jenkins
  - paragraph: Chest discomfort · Age 31
  - text: "09:00 AM In-Person In Consultation #002"
  - paragraph: Robert Chen
  - paragraph: Follow-up ECG · Age 45
  - text: "09:30 AM Walk-In Waiting #003"
  - paragraph: Anita Sharma
  - paragraph: Routine check-up · Age 28
  - text: "10:00 AM Online Waiting #004"
  - paragraph: Michael Scott
  - paragraph: Blood pressure review · Age 52
  - text: "10:30 AM In-Person Pending #005"
  - paragraph: Priya Nair
  - paragraph: Post-op follow-up · Age 37
  - text: "11:00 AM Online Pending #006"
  - paragraph: James Wong
  - paragraph: Cardiac stress test results · Age 61
  - text: 11:30 AM In-Person Done You've seen
  - strong: "1"
  - text: patient(s) today.Keep up the great work!
```

# Test source

```ts
  1  | /**
  2  |  * Test Suite: Staff Doctor Portal Login Flow
  3  |  * Covers: Doctor portal authentication, auth guard redirect for /doctor,
  4  |  * entering doctor credentials, and verifying navigation to the Doctor Workspace.
  5  |  */
  6  | import { test, expect } from '@playwright/test';
  7  | 
  8  | test.describe('Staff Doctor Portal Login', () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto('/staff/login');
  11 |     await page.evaluate(() => {
  12 |       localStorage.clear();
  13 |       sessionStorage.clear();
  14 |     });
  15 |     await page.reload();
  16 |   });
  17 | 
  18 |   test('should render staff login page with work email and password inputs', async ({ page }) => {
  19 |     await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
  20 |     await expect(page.locator('#staff-email')).toBeVisible();
  21 |     await expect(page.locator('#staff-password')).toBeVisible();
  22 |     await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  23 |   });
  24 | 
  25 |   test('should redirect unauthenticated access on /doctor to /staff/login', async ({ page }) => {
  26 |     await page.goto('/doctor');
  27 |     await expect(page).toHaveURL(/\/staff\/login/);
  28 |   });
  29 | 
  30 |   test('should successfully log in as Doctor and navigate to Doctor Workspace', async ({ page }) => {
  31 |     // Intercept staff login endpoint
  32 |     await page.route('**/api/staff/login', async (route) => {
  33 |       await route.fulfill({
  34 |         status: 200,
  35 |         contentType: 'application/json',
  36 |         body: JSON.stringify({
  37 |           success: true,
  38 |           staff: {
  39 |             id: 'doc-1',
  40 |             name: 'Dr. Olivia Wilson',
  41 |             email: 'doctor@carepulse.com',
  42 |             role: 'doctor',
  43 |             department: 'Cardiology',
  44 |           },
  45 |           token: 'token-doc-session',
  46 |         }),
  47 |       });
  48 |     });
  49 | 
  50 |     await page.locator('#staff-email').fill('doctor@carepulse.com');
  51 |     await page.locator('#staff-password').fill('password123');
  52 |     await page.getByRole('button', { name: 'Sign In' }).click();
  53 | 
  54 |     // Verify navigation into the Doctor Portal
  55 |     await expect(page).toHaveURL(/\/doctor/);
> 56 |     await expect(page.getByText('Doctor Workspace')).toBeVisible();
     |                                                      ^ Error: expect(locator).toBeVisible() failed
  57 |   });
  58 | });
  59 | 
```