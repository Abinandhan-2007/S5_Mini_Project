import { test, expect } from '@playwright/test';

test.describe('Patient Appointment Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Seed authenticated patient state
    await page.addInitScript(() => {
      const mockUser = {
        id: 'usr-patient-101',
        fullName: 'Alexander Wright',
        email: 'alex.wright@example.com',
        phone: '+1 (555) 987-6543',
        patientCode: 'P-501',
      };
      localStorage.setItem('carepulse_user', JSON.stringify(mockUser));
      localStorage.setItem('has_logged_in', 'true');
      sessionStorage.setItem('carepulse_app_unlocked', 'true');
      localStorage.setItem('carepulse_skip_splash', 'true');
    });

    const mockSlotCapacities = [
      {
        id: 'slot-1',
        timeSlot: '10:00 AM - 11:00 AM',
        maxSeats: 10,
        bookedSeats: 2,
        availableSeats: 8,
        onlineMaxSeats: 5,
        onlineBookedSeats: 1,
        onlineAvailableSeats: 4,
        offlineMaxSeats: 5,
        offlineBookedSeats: 1,
        offlineAvailableSeats: 4,
        isAvailable: true,
      },
    ];

    // Mock doctor profile
    await page.route('**/doctors/doc-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'doc-1',
          name: 'Dr. Olivia Wilson',
          specialty: 'Cardiology',
          department: 'Cardiology',
          hospitalId: 'hosp-1',
          hospitalName: 'CarePulse Central Hospital',
          rating: 4.9,
          reviewsCount: 128,
          experienceYears: 10,
          consultationFee: 600,
          isAvailable: true,
          about: 'Senior Consultant Cardiologist specializing in adult cardiac care.',
          availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          slotCapacities: mockSlotCapacities,
        }),
      });
    });

    // Mock doctor slots endpoint
    await page.route('**/doctors/doc-1/slots**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          slots: mockSlotCapacities,
        }),
      });
    });

    // Intercept appointment creation API
    await page.route('**/appointments**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'appt-booked-777',
            ticketNumber: 'TK-777',
            patientName: 'Alexander Wright',
            doctorName: 'Dr. Olivia Wilson',
            doctorSpecialty: 'Cardiology',
            hospitalName: 'CarePulse Central Hospital',
            date: '2026-09-17',
            timeSlot: '10:00 AM - 11:00 AM',
            status: 'Upcoming',
            type: 'In-Person',
          }),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should render doctor booking details, date scroller, and time slot grid', async ({ page }) => {
    await page.goto('/appointments/book/doc-1');

    // Assert booking screen layout elements
    await expect(page.getByRole('heading', { name: 'Book Appointment' })).toBeVisible();
    await expect(page.getByText('Dr. Olivia Wilson').first()).toBeVisible();
    await expect(page.getByText('CarePulse Central Hospital').first()).toBeVisible();
    await expect(page.getByText(/Select Appointment Date/i)).toBeVisible();

    // Verify booking action button is present
    await expect(page.getByRole('button', { name: /Confirm & Generate Token|Select a Time Slot/i })).toBeVisible();
  });

  test('should complete the booking process and display confirmation digital pass', async ({ page }) => {
    await page.goto('/appointments/book/doc-1');

    await expect(page.getByText('Dr. Olivia Wilson').first()).toBeVisible();

    // If a future date button (e.g. TOM) is available, click it to ensure active slots
    const tomBtn = page.getByRole('button', { name: /TOM/i }).or(page.locator('button:has-text("TOM")')).first();
    if (await tomBtn.isVisible()) {
      await tomBtn.click();
    }

    // Select the available time slot
    const slotCard = page.getByText(/10:00 AM/i).first();
    await expect(slotCard).toBeVisible();
    await slotCard.click();

    // Click Confirm & Generate Token button
    const confirmButton = page.getByRole('button', { name: /Confirm & Generate Token/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Verify confirmation modal displays digital pass
    await expect(
      page.getByText(/Appointment Confirmed!/i)
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(/CarePulse FastPass/i)
    ).toBeVisible();
  });
});
