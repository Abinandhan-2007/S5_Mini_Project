import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Info, Calendar as CalendarIcon, Star, CheckCircle, ArrowRight, Award } from 'lucide-react';
import { TopBar } from '../../components/ui/TopBar';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { DateScroller, generateUpcomingDates } from '../../components/ui/DateScroller';
import { TimeSlotGrid } from '../../components/ui/TimeSlotGrid';
import { Button } from '../../components/ui/Button';
import { MOCK_DOCTORS } from '../../lib/mockApi';
import { useCarePulseStore } from '../../lib/store';

export const BookAppointmentScreen: React.FC = () => {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const appointments = useCarePulseStore((s) => s.appointments);
  const addAppointment = useCarePulseStore((s) => s.addAppointment);

  const doctor = MOCK_DOCTORS.find((d) => d.id === doctorId) || MOCK_DOCTORS[0];

  const upcomingDates = generateUpcomingDates();
  const [selectedDate, setSelectedDate] = useState(upcomingDates[0].fullDate);
  const [selectedSlot, setSelectedSlot] = useState('10:30 AM');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleConfirmBooking = () => {
    // Generate sequential ticket number in series
    const nextNum = 482 + appointments.length;
    const newTicketNum = `TK-${nextNum}`;

    addAppointment({
      id: `app-${Date.now()}`,
      ticketNumber: newTicketNum,
      patientId: 'usr-101',
      patientName: 'Sarah Jenkins',
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      doctorPhoto: doctor.photoUrl,
      hospitalName: doctor.hospitalName,
      date: selectedDate,
      timeSlot: selectedSlot,
      type: 'In-Person',
      status: 'Upcoming',
      daysLeftText: 'In 2 days',
    });

    setIsSuccessModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white pb-28 w-full relative">
      <TopBar title="Book Appointment" showBack showAvatar />

      <main className="px-3.5 py-3 space-y-3.5">
        {/* Doctor Summary Card */}
        <Card padding="sm" variant="accent" className="shadow-2xs bg-[#F8FAFC] border border-[#E4E7EC]">
          <div className="flex gap-3 items-center">
            <Avatar src={doctor.photoUrl} alt={doctor.name} size="md" />
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold font-heading text-[#111827]">{doctor.name}</h2>
              <p className="text-[10px] font-bold text-[#0B5A54] uppercase tracking-wider">{doctor.specialty}</p>

              <div className="flex items-center gap-2 text-[10px] text-[#6B7280] pt-0.5">
                <span className="flex items-center gap-0.5">
                  <Award className="w-3 h-3 text-[#14B8A6]" /> {doctor.experienceYears} yrs exp
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-amber-700 font-semibold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {doctor.rating} ({doctor.reviewsCount})
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Select Date Section */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-0.5">
            <h3 className="text-[10px] font-extrabold font-heading text-[#6B7280] uppercase tracking-wider flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-[#0B5A54]" /> SELECT DATE
            </h3>
            <span className="text-xs font-semibold text-[#0B5A54]">August 2026</span>
          </div>

          <DateScroller selectedDate={selectedDate} onSelectDate={(d) => setSelectedDate(d)} />
        </div>

        {/* Available Slots Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-0.5">
            <h3 className="text-[10px] font-extrabold font-heading text-[#6B7280] uppercase tracking-wider">AVAILABLE SLOTS</h3>
            <span className="text-[11px] font-semibold text-[#14B8A6]">Selected: {selectedSlot}</span>
          </div>

          <TimeSlotGrid selectedSlot={selectedSlot} onSelectSlot={(slot) => setSelectedSlot(slot)} />
        </div>

        {/* Cancellation Info Banner */}
        <div className="bg-[#DCEEFB] border border-[#14B8A6]/30 rounded-xl p-3 flex gap-2.5 items-start text-[11px] text-[#0B5A54]">
          <Info className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
          <p className="leading-tight font-medium">
            You can cancel or reschedule this appointment up to 24 hours before the scheduled time without any fee.
          </p>
        </div>
      </main>

      {/* Sticky Bottom Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-[430px] sm:max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-[#E4E7EC] p-3 z-30 shadow-lg">
        <Button
          fullWidth
          size="md"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={handleConfirmBooking}
        >
          Confirm Appointment →
        </Button>
      </div>

      {/* SUCCESS CONFIRMATION MODAL */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 text-center space-y-3 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-[#E3F3F1] text-[#0B5A54] flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-[#0B5A54]" />
            </div>

            <div className="space-y-0.5">
              <h3 className="text-base font-extrabold font-heading text-[#111827]">Appointment Booked!</h3>
              <p className="text-xs text-[#6B7280]">
                Confirmed with <strong className="text-[#0B5A54]">{doctor.name}</strong> for{' '}
                <strong>{selectedDate}</strong> at <strong>{selectedSlot}</strong>.
              </p>
            </div>

            <div className="bg-[#F3F5F8] p-3 rounded-xl text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Facility:</span>
                <span className="font-bold text-[#111827]">{doctor.hospitalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Consultation:</span>
                <span className="font-bold text-[#0B5A54]">In-Person Visit</span>
              </div>
            </div>

            <Button
              fullWidth
              size="sm"
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate('/home');
              }}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
