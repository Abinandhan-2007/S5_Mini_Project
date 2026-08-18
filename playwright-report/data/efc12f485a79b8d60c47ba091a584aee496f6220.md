# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff\receptionist-login.spec.ts >> Staff Receptionist Portal Login >> should successfully log in as Receptionist and navigate to Receptionist Desk
- Location: tests\staff\receptionist-login.spec.ts:30:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Receptionist Desk')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Receptionist Desk')

```

```yaml
- banner:
  - text: CarePulse
  - navigation:
    - button "Dashboard"
    - button "Doctors"
    - button "Patient Bookings"
    - button "Token Queue"
    - button "Profile"
  - button "Appointment"
  - button "Notifications"
  - button "Emily Watson"
  - button "Logout"
- main:
  - heading "OPD Reception Desk" [level=1]
  - paragraph: Manage live patient arrival queues, token calls, and doctor consultation room availability.
  - button "+ Book Walk-In Patient"
  - text: Queue Waiting 5
  - paragraph: Patients in waiting hall
  - text: In Consultation 2
  - paragraph: Active doctor consultations
  - text: Available Doctors 9 / 10
  - paragraph: Active OPD duty doctors
  - text: Completed Visits 0
  - paragraph: Consultations done
  - heading "Recent Arrival Queue" [level=2]
  - text: "7 total tokens #TOK-001"
  - heading "Sarah Jenkins" [level=4]
  - paragraph: Dr. Olivia Wilson (Cardiologist) • 10:00 AM - 11:00 AM
  - text: "Waiting #TOK-002"
  - heading "Robert Chen" [level=4]
  - paragraph: Dr. Olivia Wilson (Cardiologist) • 10:00 AM - 11:00 AM
  - text: "Waiting #TOK-003"
  - heading "Anita Sharma" [level=4]
  - paragraph: Dr. Marcus Vance (Dermatologist) • 11:00 AM - 12:00 PM
  - text: "Waiting #TOK-004"
  - heading "Michael Scott" [level=4]
  - paragraph: Dr. Ethan Reynolds (Neurologist) • 02:00 PM - 03:00 PM
  - text: "Waiting #TOK-005"
  - heading "David Miller" [level=4]
  - paragraph: Dr. Olivia Wilson (Cardiologist) • 10:00 AM - 11:00 AM
  - text: Waiting
  - heading "On-Duty Doctors" [level=2]
  - paragraph: Toggle Available / Not Available status for active doctors.
  - img "Dr. Olivia Wilson"
  - heading "Dr. Olivia Wilson" [level=4]
  - paragraph: Cardiologist
  - button "Available"
  - img "Dr. Marcus Vance"
  - heading "Dr. Marcus Vance" [level=4]
  - paragraph: Dermatologist
  - button "Available"
  - img "Dr. Sophia Patel"
  - heading "Dr. Sophia Patel" [level=4]
  - paragraph: Pediatrician
  - button "Unavailable"
  - img "Dr. Ethan Reynolds"
  - heading "Dr. Ethan Reynolds" [level=4]
  - paragraph: Neurologist
  - button "Available"
  - img "Dr. Arlene McCoy"
  - heading "Dr. Arlene McCoy" [level=4]
  - paragraph: Physician
  - button "Available"
  - img "Dr. Eleanor Pena"
  - heading "Dr. Eleanor Pena" [level=4]
  - paragraph: Arthropathic
  - button "Available"
  - img "Dr. Johan Janson"
  - heading "Dr. Johan Janson" [level=4]
  - paragraph: Endocrinologist
  - button "Available"
  - img "Dr. Kaiya Donin"
  - heading "Dr. Kaiya Donin" [level=4]
  - paragraph: Endocrinologist
  - button "Available"
  - img "Dr. Marilyn Stanton"
  - heading "Dr. Marilyn Stanton" [level=4]
  - paragraph: General Physician
  - button "Available"
  - img "Dr. Marvin McKinney"
  - heading "Dr. Marvin McKinney" [level=4]
  - paragraph: Cardiologist
  - button "Available"
```

# Test source

```ts
  1  | /**
  2  |  * Test Suite: Staff Receptionist Portal Login Flow
  3  |  * Covers: Receptionist portal authentication, auth guard redirect for /receptionist,
  4  |  * entering receptionist credentials, and verifying navigation to the Receptionist Desk.
  5  |  */
  6  | import { test, expect } from '@playwright/test';
  7  | 
  8  | test.describe('Staff Receptionist Portal Login', () => {
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
  25 |   test('should redirect unauthenticated access on /receptionist to /staff/login', async ({ page }) => {
  26 |     await page.goto('/receptionist');
  27 |     await expect(page).toHaveURL(/\/staff\/login/);
  28 |   });
  29 | 
  30 |   test('should successfully log in as Receptionist and navigate to Receptionist Desk', async ({ page }) => {
  31 |     // Intercept staff login endpoint
  32 |     await page.route('**/api/staff/login', async (route) => {
  33 |       await route.fulfill({
  34 |         status: 200,
  35 |         contentType: 'application/json',
  36 |         body: JSON.stringify({
  37 |           success: true,
  38 |           staff: {
  39 |             id: 'rec-101',
  40 |             name: 'Emily Watson',
  41 |             email: 'receptionist@carepulse.com',
  42 |             role: 'receptionist',
  43 |             department: 'Front Desk',
  44 |           },
  45 |           token: 'token-rec-session',
  46 |         }),
  47 |       });
  48 |     });
  49 | 
  50 |     await page.locator('#staff-email').fill('receptionist@carepulse.com');
  51 |     await page.locator('#staff-password').fill('password123');
  52 |     await page.getByRole('button', { name: 'Sign In' }).click();
  53 | 
  54 |     // Verify navigation into the Receptionist Portal
  55 |     await expect(page).toHaveURL(/\/receptionist/);
> 56 |     await expect(page.getByText('Receptionist Desk')).toBeVisible();
     |                                                       ^ Error: expect(locator).toBeVisible() failed
  57 |   });
  58 | });
  59 | 
```