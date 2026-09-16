import { test, expect } from '@playwright/test';

test.describe('Receptionist Token Generation & Queue Management', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated Receptionist session
    await page.addInitScript(() => {
      const receptionistStaff = {
        id: 'rec-1',
        name: 'Receptionist Sarah Connor',
        email: 'receptionist@carepulse.com',
        role: 'receptionist',
        department: 'Front Desk OPD',
        hospital_id: 'hosp-1',
        hospitalId: 'hosp-1',
      };
      localStorage.setItem('carepulse_staff', JSON.stringify(receptionistStaff));
      localStorage.setItem('carepulse_staff_token', 'mock-receptionist-jwt-token');
      localStorage.setItem('carepulse_staff_role', 'receptionist');
      localStorage.setItem('carepulse_skip_splash', 'true');
    });

    // Mock doctors
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
              isAvailable: true,
            },
          ],
        }),
      });
    });

    const mockTokens = [
      {
        id: 'tok-rec-1',
        tokenNumber: 'A-201',
        ticketNumber: 'A-201',
        patientName: 'David Miller',
        patientPhone: '+1 (555) 456-7890',
        doctorName: 'Dr. Olivia Wilson',
        doctorSpecialty: 'Cardiology',
        status: 'Waiting',
        timeSlot: '10:00 AM - 11:00 AM',
        type: 'Walk-In',
        arrivalTime: '10:15 AM',
        age: 42,
        bloodGroup: 'A+',
        date: new Date().toISOString().split('T')[0],
      },
      {
        id: 'tok-rec-2',
        tokenNumber: 'A-202',
        ticketNumber: 'A-202',
        patientName: 'Emily Watson',
        patientPhone: '+1 (555) 654-3210',
        doctorName: 'Dr. Olivia Wilson',
        doctorSpecialty: 'Cardiology',
        status: 'Waiting',
        timeSlot: '10:30 AM - 11:30 AM',
        type: 'Appointment',
        arrivalTime: '10:20 AM',
        age: 29,
        bloodGroup: 'O-',
        date: new Date().toISOString().split('T')[0],
      },
    ];

    await page.route('**/receptionist/tokens**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          tokens: mockTokens,
        }),
      });
    });

    await page.route('**/receptionist/bookings**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          tokens: mockTokens,
        }),
      });
    });

    await page.goto('/staff/receptionist');
  });

  test('should render Receptionist Portal dashboard and overview metrics', async ({ page }) => {
    await expect(page).toHaveURL(/\/staff\/receptionist/);
    await expect(page.getByRole('button', { name: /OPD Command Center/i })).toBeVisible();
    await expect(page.getByText('On-Duty Doctors').first()).toBeVisible();
  });

  test('should navigate to Patient Bookings tab and display booked patients', async ({ page }) => {
    const bookingsTabBtn = page.getByRole('button', { name: /Patient Bookings/i }).first();
    await bookingsTabBtn.click();

    await expect(page.getByPlaceholder(/token #, doctor/i)).toBeVisible();
    await expect(page.locator('main').getByText('David Miller').or(page.locator('main').getByText('Emily Watson')).first()).toBeVisible();
  });

  test('should filter token bookings by patient name search', async ({ page }) => {
    const bookingsTabBtn = page.getByRole('button', { name: /Patient Bookings/i }).first();
    await bookingsTabBtn.click();

    // Select the Walk-Ins tab since David Miller is Walk-In
    const walkInsTab = page.getByRole('button', { name: /Walk-Ins/i }).first();
    if (await walkInsTab.isVisible()) {
      await walkInsTab.click();
    }

    const searchInput = page.getByPlaceholder(/token #, doctor/i);
    await searchInput.fill('David');
    await expect(page.locator('main').getByText('David Miller').first()).toBeVisible();

    await searchInput.fill('NonExistentPatientXYZ999');
    await expect(page.locator('main').getByText('David Miller')).not.toBeVisible();
  });
});
