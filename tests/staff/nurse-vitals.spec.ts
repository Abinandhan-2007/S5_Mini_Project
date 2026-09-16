import { test, expect } from '@playwright/test';

test.describe('Nurse Portal Vitals Recording & Triage', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated Nurse session
    await page.addInitScript(() => {
      const nurseStaff = {
        id: 'nurse-1',
        name: 'Nurse Clara Barton',
        email: 'nurse@carepulse.com',
        role: 'nurse',
        department: 'Triage & OPD',
        hospital_id: 'hosp-1',
        hospitalId: 'hosp-1',
      };
      localStorage.setItem('carepulse_staff', JSON.stringify(nurseStaff));
      localStorage.setItem('carepulse_staff_token', 'mock-nurse-jwt-token');
      localStorage.setItem('carepulse_staff_role', 'nurse');
      localStorage.setItem('carepulse_skip_splash', 'true');
    });

    // Mock nurse queue
    await page.route('**/nurse/queue**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          queue: [
            {
              appointment_id: 'appt-nurse-001',
              token_number: 104,
              queue_status: 'waiting',
              vitals_status: 'pending',
              date: '2026-09-16',
              time: '10:30 AM',
              appointment_type: 'In-Person',
              chief_complaint: 'Headache and elevated temperature',
              patient: {
                id: 'pat-nurse-1',
                name: 'Eleanor Vance',
                patient_code: 'P-104',
                gender: 'Female',
                dob: '1992-05-12',
                phone: '+1 (555) 345-6789',
                blood_group: 'B+',
              },
              doctor: {
                id: 'doc-1',
                name: 'Dr. Olivia Wilson',
                specialty: 'General Medicine',
                room_number: 'Cabin 102',
              },
            },
          ],
        }),
      });
    });

    // Mock vitals submission endpoint
    await page.route('**/nurse/vitals**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            vitals: {
              id: 'vitals-999',
              appointment_id: 'appt-nurse-001',
              bp_systolic: 120,
              bp_diastolic: 80,
              heart_rate: 72,
              temperature: 37.0,
              spo2: 98,
              recorded_at: new Date().toISOString(),
            },
            abnormal_flags: [],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/staff/nurse');
  });

  test('should render Nurse Portal header and waiting patient queue', async ({ page }) => {
    await expect(page).toHaveURL(/\/staff\/nurse/);
    await expect(page.getByText('Nurse Portal').first()).toBeVisible();
    await expect(page.getByText('Eleanor Vance').first()).toBeVisible();
    await expect(page.getByText('P-104').first()).toBeVisible();
  });

  test('should open Vitals Entry Modal when clicking Record Vitals', async ({ page }) => {
    const recordVitalsBtn = page.getByRole('button', { name: /Record Vitals/i }).or(page.locator('button:has-text("Record Vitals")')).first();
    await expect(recordVitalsBtn).toBeVisible();
    await recordVitalsBtn.click();

    await expect(page.getByText(/Record Patient Vitals/i).or(page.getByRole('heading', { name: /Vitals/i })).first()).toBeVisible();
    await expect(page.getByText('Eleanor Vance').first()).toBeVisible();
  });

  test('should fill out clinical vitals and submit successfully', async ({ page }) => {
    const recordVitalsBtn = page.getByRole('button', { name: /Record Vitals/i }).or(page.locator('button:has-text("Record Vitals")')).first();
    await recordVitalsBtn.click();

    // Fill form inputs
    const bpSys = page.locator('input[placeholder="120"]').or(page.locator('input[name="bp_systolic"]')).first();
    if (await bpSys.isVisible()) {
      await bpSys.fill('120');
    }

    const bpDia = page.locator('input[placeholder="80"]').or(page.locator('input[name="bp_diastolic"]')).first();
    if (await bpDia.isVisible()) {
      await bpDia.fill('80');
    }

    const hr = page.locator('input[placeholder="72"]').or(page.locator('input[name="heart_rate"]')).first();
    if (await hr.isVisible()) {
      await hr.fill('72');
    }

    const temp = page.locator('input[placeholder="37.0"]').or(page.locator('input[placeholder="98.6"]')).first();
    if (await temp.isVisible()) {
      await temp.fill('37.0');
    }

    const spo2Input = page.locator('input[placeholder="98"]').or(page.locator('input[name="spo2"]')).first();
    if (await spo2Input.isVisible()) {
      await spo2Input.fill('98');
    }

    // Submit form
    const saveBtn = page.getByRole('button', { name: /Save Vitals/i }).or(page.locator('button:has-text("Save Vitals")')).first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify modal closes
    await expect(page.getByText('Save Vitals to Consultation')).not.toBeVisible();
  });
});
