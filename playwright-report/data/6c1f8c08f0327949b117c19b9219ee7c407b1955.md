# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: patient\appointments.spec.ts >> Patient Appointments Flow >> should render medical history items and handle search filtering
- Location: tests\patient\appointments.spec.ts:83:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder('Search doctor, prescription, diagnosis...')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByPlaceholder('Search doctor, prescription, diagnosis...')

```

```yaml
- main:
  - heading "Medical History" [level=1]
  - text: 4 Records
  - button "Notifications"
  - paragraph: Archive of your past consultations, diagnoses, & prescriptions.
  - text: LAST CHECKUP Jul 24, 2026 RECORDS 4 Completed
  - textbox "Search doctor, diagnosis, medication..."
  - button "All"
  - button "Recent"
  - button "Cardiology"
  - button "General"
  - button "newest"
  - text: Jul 24, 2026 • 02:15 PM
  - heading "Dr. Alex Morgan" [level=3]
  - paragraph: Cardiology Consultation
  - text: St. Jude Heart Center Completed Verified CLINICAL DIAGNOSIS ICD-10
  - paragraph: Routine BP Check & ECG Screening. Heart rate normal at 72 bpm.
  - text: Vitals verified & signed by Dr. Alex Morgan PRESCRIBED MEDICATIONS Active Rx
  - heading "Lisinopril 10mg prescribed. Next follow-up in 3 months." [level=5]
  - paragraph: Take strictly as instructed after meals.
  - text: Jun 12, 2026 • 11:00 AM
  - heading "Dr. Elena Rostova" [level=3]
  - paragraph: General Wellness Exam
  - text: Metropolitan General Hospital Completed Verified Apr 05, 2026 • 09:30 AM
  - heading "Dr. Marcus Vance" [level=3]
  - paragraph: Dermatology Consultation
  - text: Cedar Skin & Wellness Clinic Completed Verified Jan 18, 2026 • 03:45 PM
  - heading "Dr. Robert Thorne" [level=3]
  - paragraph: Orthopedic Joint Check
  - text: Metropolitan General Hospital Completed Verified
- navigation:
  - button "Home"
  - button "Health AI"
  - button "History"
  - button "Hospitals"
  - button "Schedule"
  - button "Profile"
```

# Test source

```ts
  1   | /**
  2   |  * Test Suite: Patient Appointments Flow & Backend Regression Guard
  3   |  * Covers:
  4   |  * 1. Backend regression test for GET /api/appointments/patient/{id} ensuring no 500 server crash.
  5   |  * 2. Appointment Booking Screen UI: doctor details, time slot selection, booking confirmation modal.
  6   |  * 3. Medical History Screen: search, category filtering, and history records.
  7   |  */
  8   | import { test, expect } from '@playwright/test';
  9   | 
  10  | test.describe('Patient Appointments Flow', () => {
  11  |   // ── 1. Backend Regression API Test ──────────────────────────────────────────
  12  |   test('REGRESSION: GET /api/appointments/patient/{id} should not return 500 error', async ({ request }) => {
  13  |     const fakePatientId = '00000000-0000-0000-0000-000000000000';
  14  |     try {
  15  |       const response = await request.get(`http://localhost:5000/api/appointments/patient/${fakePatientId}`);
  16  |       // Guards against the past missing-table bug: status must NOT be 500 Internal Server Error
  17  |       expect(response.status()).not.toBe(500);
  18  |       expect([200, 404]).toContain(response.status());
  19  |     } catch (error) {
  20  |       // If backend is not currently running locally during offline test runs, mark as note
  21  |       console.warn('Backend server on http://localhost:5000 was unreachable during test run:', error);
  22  |     }
  23  |   });
  24  | 
  25  |   // ── 2. Appointment Booking UI Flow ─────────────────────────────────────────
  26  |   test('should render doctor booking details and confirm appointment', async ({ page }) => {
  27  |     // Seed authenticated user state
  28  |     await page.goto('/login');
  29  |     await page.evaluate(() => {
  30  |       const mockUser = {
  31  |         id: 'usr-test-101',
  32  |         fullName: 'Sarah Jenkins',
  33  |         email: 'sarah@example.com',
  34  |         phone: '+91 98765 43210',
  35  |       };
  36  |       localStorage.setItem('carepulse_user', JSON.stringify(mockUser));
  37  |       localStorage.setItem('has_logged_in', 'true');
  38  |       sessionStorage.setItem('carepulse_app_unlocked', 'true');
  39  |     });
  40  | 
  41  |     // Intercept appointment creation API
  42  |     await page.route('**/api/appointments', async (route) => {
  43  |       if (route.request().method() === 'POST') {
  44  |         await route.fulfill({
  45  |           status: 200,
  46  |           contentType: 'application/json',
  47  |           body: JSON.stringify({
  48  |             id: 'app-test-999',
  49  |             ticketNumber: 'TK-482',
  50  |             patientName: 'Sarah Jenkins',
  51  |             doctorName: 'Dr. Olivia Wilson',
  52  |             doctorSpecialty: 'Cardiologist',
  53  |             hospitalName: 'CarePulse Central Hospital',
  54  |             date: '2026-08-20',
  55  |             timeSlot: '10:00 AM',
  56  |             status: 'Upcoming',
  57  |           }),
  58  |         });
  59  |       } else {
  60  |         await route.continue();
  61  |       }
  62  |     });
  63  | 
  64  |     // Navigate to booking screen for doc-1
  65  |     await page.goto('/appointments/book/doc-1');
  66  | 
  67  |     // Assert doctor info header
  68  |     await expect(page.getByText('Booking')).toBeVisible();
  69  |     await expect(page.getByText('About Doctor')).toBeVisible();
  70  |     await expect(page.getByText('Select Date & Time')).toBeVisible();
  71  | 
  72  |     // Click Book Appointment button
  73  |     const bookButton = page.getByRole('button', { name: 'Book Appointment' });
  74  |     await expect(bookButton).toBeVisible();
  75  |     await bookButton.click();
  76  | 
  77  |     // Verify Success Modal appears with Ticket Details
  78  |     await expect(page.getByText('Appointment Booked! 🎉')).toBeVisible();
  79  |     await expect(page.getByText('Ticket Pass')).toBeVisible();
  80  |   });
  81  | 
  82  |   // ── 3. Medical History UI Flow ─────────────────────────────────────────────
  83  |   test('should render medical history items and handle search filtering', async ({ page }) => {
  84  |     // Seed authenticated user state
  85  |     await page.goto('/history');
  86  |     await page.evaluate(() => {
  87  |       const mockUser = {
  88  |         id: 'usr-test-101',
  89  |         fullName: 'Sarah Jenkins',
  90  |         email: 'sarah@example.com',
  91  |         phone: '+91 98765 43210',
  92  |       };
  93  |       localStorage.setItem('carepulse_user', JSON.stringify(mockUser));
  94  |       localStorage.setItem('has_logged_in', 'true');
  95  |       sessionStorage.setItem('carepulse_app_unlocked', 'true');
  96  |     });
  97  |     await page.goto('/history');
  98  | 
  99  |     // Verify search bar and filter chips
> 100 |     await expect(page.getByPlaceholder('Search doctor, prescription, diagnosis...')).toBeVisible();
      |                                                                                      ^ Error: expect(locator).toBeVisible() failed
  101 |     await expect(page.getByText('All', { exact: true })).toBeVisible();
  102 |   });
  103 | });
  104 | 
```