import { test, expect } from '@playwright/test';

test.describe('Doctor Consultation Queue & Management', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated Doctor session
    await page.addInitScript(() => {
      const doctorStaff = {
        id: 'doc-1',
        doctorId: 'doc-1',
        name: 'Dr. Olivia Wilson',
        email: 'doctor@carepulse.com',
        role: 'doctor',
        department: 'Cardiology',
        hospital_id: 'hosp-1',
        hospitalId: 'hosp-1',
      };
      localStorage.setItem('carepulse_staff', JSON.stringify(doctorStaff));
      localStorage.setItem('carepulse_staff_token', 'mock-doctor-jwt-token');
      localStorage.setItem('carepulse_staff_role', 'doctor');
      localStorage.setItem('carepulse_skip_splash', 'true');
    });

    // Mock doctors API
    await page.route('**/receptionist/doctors**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          doctors: [
            {
              id: 'doc-1',
              name: 'Dr. Olivia Wilson',
              specialty: 'Cardiology',
              department: 'Cardiology',
              hospitalId: 'hosp-1',
              hospital_id: 'hosp-1',
              isAvailable: true,
              is_available: true,
            },
          ],
        }),
      });
    });

    await page.route('**/admin/doctors**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          doctors: [
            {
              id: 'doc-1',
              name: 'Dr. Olivia Wilson',
              specialty: 'Cardiology',
              department: 'Cardiology',
              hospitalId: 'hosp-1',
              hospital_id: 'hosp-1',
              isAvailable: true,
              is_available: true,
            },
          ],
        }),
      });
    });

    // Mock doctor queue endpoint (receptionistService.getTokenQueue)
    await page.route('**/receptionist/tokens**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          tokens: [
            {
              id: 'tok-101',
              patientId: 'pat-1',
              tokenNumber: 'A-101',
              ticketNumber: 'A-101',
              patientName: 'Sarah Jenkins',
              patientPhone: '+1 (555) 234-5678',
              doctorId: 'doc-1',
              doctorName: 'Dr. Olivia Wilson',
              doctorSpecialty: 'Cardiology',
              timeSlot: '10:00 AM - 11:00 AM',
              status: 'Waiting',
              type: 'In-Person',
              arrivalTime: '10:05 AM',
              issueTime: '10:00 AM',
              date: '16 Sep 2026',
              age: 34,
              bloodGroup: 'O+',
              healthIssue: 'Chest tightness and palpitations',
            },
            {
              id: 'tok-102',
              patientId: 'pat-2',
              tokenNumber: 'A-102',
              ticketNumber: 'A-102',
              patientName: 'Robert Vance',
              patientPhone: '+1 (555) 876-5432',
              doctorId: 'doc-1',
              doctorName: 'Dr. Olivia Wilson',
              doctorSpecialty: 'Cardiology',
              timeSlot: '11:00 AM - 12:00 PM',
              status: 'In Consultation',
              type: 'In-Person',
              arrivalTime: '10:45 AM',
              issueTime: '10:30 AM',
              date: '16 Sep 2026',
              age: 58,
              bloodGroup: 'A+',
              healthIssue: 'Follow-up hypertension checkup',
            },
          ],
        }),
      });
    });

    await page.goto('/staff/doctor');
  });

  test('should render doctor dashboard with active queue overview', async ({ page }) => {
    await expect(page).toHaveURL(/\/staff\/doctor/);
    await expect(page.getByText('CAREPULSE MD').or(page.getByText('Doctor Workspace'))).toBeVisible();
    await expect(page.getByText('Dr. Olivia Wilson').first()).toBeVisible();
  });

  test('should switch to Patient Queue tab and display queue patients', async ({ page }) => {
    const queueNavBtn = page.getByRole('button', { name: /Patient Live Queue/i }).or(page.locator('button:has-text("Patient Live Queue")')).first();
    await queueNavBtn.click();

    await expect(page.getByPlaceholder(/Search waiting queue/i)).toBeVisible();
    await expect(page.getByText('Sarah Jenkins').first()).toBeVisible();
    await expect(page.getByText('A-101').first()).toBeVisible();
  });

  test('should filter patient queue using the search bar', async ({ page }) => {
    const queueNavBtn = page.getByRole('button', { name: /Patient Live Queue/i }).or(page.locator('button:has-text("Patient Live Queue")')).first();
    await queueNavBtn.click();

    const searchInput = page.getByPlaceholder(/Search waiting queue/i).first();
    await searchInput.fill('Sarah');
    await expect(page.getByText('Sarah Jenkins').first()).toBeVisible();

    await searchInput.fill('NonExistentXYZ999');
    await expect(page.getByText('Sarah Jenkins')).not.toBeVisible();
  });

  test('should trigger patient consultation selection from queue', async ({ page }) => {
    const queueNavBtn = page.getByRole('button', { name: /Patient Live Queue/i }).or(page.locator('button:has-text("Patient Live Queue")')).first();
    await queueNavBtn.click();

    const acceptBtn = page.getByRole('button', { name: /Accept/i }).first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    await expect(page.getByText(/Active Consultation/i).or(page.getByText(/Consultation/i)).first()).toBeVisible();
  });
});
