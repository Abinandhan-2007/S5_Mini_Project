# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff\admin-login.spec.ts >> Staff Admin Portal Login >> should redirect unauthenticated access on /admin to /staff/login
- Location: tests\staff\admin-login.spec.ts:27:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/staff\/login/
Received string:  "http://localhost:5173/admin"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    10 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:5173/admin"

```

```yaml
- complementary:
  - heading "CarePulse" [level=1]
  - text: Admin Command Center
  - paragraph: CarePulse Central Hospital
  - paragraph: Enterprise Central Hub
  - navigation:
    - button "Dashboard"
    - button "Doctors"
    - button "Receptionists"
    - button "Hospitals"
    - button "Tokens & Slots"
    - button "Patient Bookings"
    - button "Reports & Analytics"
    - button "Settings & Facility"
  - img "Dr. Arthur Vance"
  - paragraph: Dr. Arthur Vance
  - paragraph: Chief Medical Administration
  - button "Sign Out"
- banner:
  - textbox "Global search across doctors, receptionists, tickets..."
  - button "Hospital Notifications"
  - button "Dr. Arthur Vance Dr.":
    - img "Dr. Arthur Vance"
    - text: Dr.
- main:
  - heading "Command Dashboard" [level=1]
  - text: CarePulse Central Hospital
  - paragraph: Executive oversight of hospital network, medical staffing, bookings, and facility intelligence.
  - paragraph: All Systems Synced
  - paragraph: "Last sync: Just now"
  - text: ↑12% Total Hospitals 4
  - paragraph: Across 4 active clinical branches
  - text: ↑8% Reception Desks 3
  - paragraph: Active front-desk stations
  - text: ↑18% Total Bookings 1,432
  - paragraph: Online & OPD appointments
  - text: ↑14% Total Patients 3,890
  - paragraph: Registered health records
  - heading "Appointment & Patient Volume Trends" [level=3]
  - paragraph: Dual-series breakdown comparing patient attendance vs completed doctor consults
  - button "week"
  - button "month"
  - button "year"
  - text: Appointments Patients Mon Tue Wed Thu Fri Sat Sun
  - heading "Administrative Shortcuts" [level=3]
  - paragraph: Quick-launch creation and overview workflows
  - button "Add Hospital Branch location & logo":
    - heading "Add Hospital" [level=4]
    - paragraph: Branch location & logo
  - button "Add Receptionist Desk & shift roster":
    - heading "Add Receptionist" [level=4]
    - paragraph: Desk & shift roster
  - button "Tokens & Slots Capacity & overrides":
    - heading "Tokens & Slots" [level=4]
    - paragraph: Capacity & overrides
  - button "View Reports Clinical analytics suite":
    - heading "View Reports" [level=4]
    - paragraph: Clinical analytics suite
  - heading "Recent Operations Feed" [level=3]
  - paragraph: Live audit trail of doctor actions, receptionist check-ins, bookings, and system triggers
  - button "View All Activity"
  - img "Dr. Olivia Wilson"
  - text: Dr. Olivia Wilson Doctor 25m ago
  - paragraph: Completed 14 clinical cardiology appointments
  - img "Emily Watson (Desk A-1)"
  - text: Emily Watson (Desk A-1) Receptionist 1h ago
  - paragraph: "Issued walk-in token #TOK-004 for Dr. Ethan Reynolds"
  - img "CarePulse System"
  - text: CarePulse System Hospital 2h ago
  - paragraph: New hospital branch "Downtown Urgent Care" synchronized
  - img "Sarah Jenkins"
  - text: Sarah Jenkins Booking 3h ago
  - paragraph: Online appointment confirmed with Dr. Marcus Vance (#CP-4821)
  - heading "Top Performing Doctors" [level=3]
  - paragraph: This week's clinical leaderboards
  - img "Dr. Olivia Wilson"
  - text: "#1"
  - heading "Dr. Olivia Wilson" [level=4]
  - paragraph: Cardiology
  - paragraph: 54 Visits
  - paragraph: ★ 4.9
  - img "Dr. Sophia Patel"
  - text: "#2"
  - heading "Dr. Sophia Patel" [level=4]
  - paragraph: Pediatrics
  - paragraph: 48 Visits
  - paragraph: ★ 4.9
  - img "Dr. Marcus Vance"
  - text: "#3"
  - heading "Dr. Marcus Vance" [level=4]
  - paragraph: Dermatology
  - paragraph: 42 Visits
  - paragraph: ★ 4.8
```

# Test source

```ts
  1  | /**
  2  |  * Test Suite: Staff Admin Portal Login Flow
  3  |  * Covers: Staff portal login rendering, auth guard redirect for /admin,
  4  |  * entering admin credentials, and verifying navigation to the Admin Dashboard.
  5  |  */
  6  | import { test, expect } from '@playwright/test';
  7  | 
  8  | test.describe('Staff Admin Portal Login', () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto('/staff/login');
  11 |     await page.evaluate(() => {
  12 |       localStorage.clear();
  13 |       sessionStorage.clear();
  14 |     });
  15 |     await page.reload();
  16 |   });
  17 | 
  18 |   test('should render staff login page with correct layout and security branding', async ({ page }) => {
  19 |     await expect(page.getByRole('heading', { name: 'CarePulse', exact: true })).toBeVisible();
  20 |     await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
  21 |     await expect(page.getByText('Enter your work credentials to access your portal.')).toBeVisible();
  22 |     await expect(page.locator('#staff-email')).toBeVisible();
  23 |     await expect(page.locator('#staff-password')).toBeVisible();
  24 |     await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  25 |   });
  26 | 
  27 |   test('should redirect unauthenticated access on /admin to /staff/login', async ({ page }) => {
  28 |     await page.goto('/admin');
> 29 |     await expect(page).toHaveURL(/\/staff\/login/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  30 |   });
  31 | 
  32 |   test('should successfully log in as Admin and navigate to Admin Command Center', async ({ page }) => {
  33 |     // Intercept staff login endpoint (or test static fallback)
  34 |     await page.route('**/api/staff/login', async (route) => {
  35 |       await route.fulfill({
  36 |         status: 200,
  37 |         contentType: 'application/json',
  38 |         body: JSON.stringify({
  39 |           success: true,
  40 |           staff: {
  41 |             id: 'admin-1',
  42 |             name: 'Dr. Arthur Vance',
  43 |             email: 'admin@carepulse.com',
  44 |             role: 'admin',
  45 |             department: 'Chief Medical Administration',
  46 |           },
  47 |           token: 'token-admin-session',
  48 |         }),
  49 |       });
  50 |     });
  51 | 
  52 |     await page.locator('#staff-email').fill('admin@carepulse.com');
  53 |     await page.locator('#staff-password').fill('admin123');
  54 |     await page.getByRole('button', { name: 'Sign In' }).click();
  55 | 
  56 |     // Verify navigation into the Admin Portal
  57 |     await expect(page).toHaveURL(/\/admin/);
  58 |     await expect(page.getByText('Dashboard', { exact: true })).toBeVisible();
  59 |   });
  60 | });
  61 | 
```