import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Info, Calendar as CalendarIcon, Star, CheckCircle2, ArrowRight, Award, Ticket, Clock, Building2, X } from 'lucide-react';
import { TopBar } from '../../components/ui/TopBar';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { CalendarPicker } from '../../components/ui/CalendarPicker';
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

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [bookedTicket, setBookedTicket] = useState('');

  const handleConfirmBooking = () => {
    const nextNum = 482 + appointments.length;
    const newTicketNum = `TK-${nextNum}`;
    setBookedTicket(newTicketNum);

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
    <div className="min-h-screen bg-[#F8FAFC] pb-28 w-full relative select-none">
      <TopBar title="Book Appointment" showBack showAvatar />

      <main className="px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        {/* Doctor Summary Card */}
        <Card padding="md" className="shadow-xs bg-white border border-[#E4E7EC] rounded-2xl text-left space-y-2">
          <div className="flex gap-3.5 items-center">
            <Avatar src={doctor.photoUrl} alt={doctor.name} size="lg" />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold font-heading text-[#111827] truncate">{doctor.name}</h2>
                <span className="text-[10px] font-extrabold text-[#0B5A54] bg-[#E3F3F1] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {doctor.specialty}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                <Building2 className="w-3.5 h-3.5 text-[#0B5A54] shrink-0" />
                <span className="truncate">{doctor.hospitalName}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#6B7280] pt-0.5">
                <span className="flex items-center gap-1 font-semibold text-slate-800">
                  <Award className="w-3.5 h-3.5 text-[#0B5A54]" /> {doctor.experienceYears} yrs exp
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-600 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {doctor.rating} ({doctor.reviewsCount})
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Select Date Section - Clean Button that opens Calendar Modal */}
        <div className="space-y-2 text-left">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-extrabold font-heading text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-[#0B5A54]" /> Select Consultation Date
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setIsCalendarOpen(true)}
            className="w-full bg-white border border-[#E4E7EC] hover:border-[#0B5A54] rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E3F3F1] flex items-center justify-center text-[#0B5A54] shrink-0">
                <CalendarIcon className="w-5 h-5 text-[#0B5A54]" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-extrabold uppercase text-[#6B7280] tracking-wider block">
                  Chosen Date
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading">
                  {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#0B5A54] bg-[#E3F3F1] border border-[#0B5A54]/20 px-3 py-1.5 rounded-full group-hover:bg-[#0B5A54] group-hover:text-white transition-all shadow-2xs">
              Open Calendar
            </span>
          </button>
        </div>

        {/* CALENDAR POPUP MODAL */}
        {isCalendarOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-4 shadow-2xl max-w-sm w-full space-y-3 relative border border-slate-200 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#0B5A54]" />
                  <h3 className="text-sm font-extrabold text-slate-900 font-heading">Select Date</h3>
                </div>
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <CalendarPicker
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setIsCalendarOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Available Slots Section */}
        <div className="space-y-2 text-left">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-extrabold font-heading text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0B5A54]" /> Available Time Slots
            </h3>
            <span className="text-xs font-bold text-[#0B5A54]">
              Selected: <strong className="text-emerald-700">{selectedSlot}</strong>
            </span>
          </div>

          <TimeSlotGrid selectedSlot={selectedSlot} onSelectSlot={(slot) => setSelectedSlot(slot)} />
        </div>

        {/* Cancellation Guarantee Info Banner */}
        <div className="bg-[#E3F3F1]/60 border border-[#0B5A54]/20 rounded-2xl p-3.5 flex gap-3 items-start text-left text-xs text-[#0B5A54] shadow-2xs">
          <Info className="w-4 h-4 text-[#0B5A54] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold block text-slate-900">Free Rescheduling & Cancellation</span>
            <p className="leading-relaxed text-[#0B5A54] font-medium">
              You can cancel or reschedule this booking up to 24 hours prior to your visit without any fee.
            </p>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-[#E4E7EC] p-3.5 z-30 shadow-lg flex items-center justify-between gap-3">
        <div className="text-left space-y-0.5">
          <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">SELECTED TIME</span>
          <span className="text-xs font-extrabold text-[#0B5A54]">{selectedSlot}</span>
        </div>
        <Button
          size="md"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={handleConfirmBooking}
          className="py-3 px-6 rounded-xl font-bold text-xs shadow-md"
        >
          Confirm Appointment
        </Button>
      </div>

      {/* ULTRA PREMIUM SUCCESS CONFIRMATION MODAL */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 border border-[#E4E7EC]">
            {/* Animated Success Badge */}
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 ring-8 ring-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold font-heading text-slate-900">Appointment Booked! 🎉</h3>
              <p className="text-xs text-slate-600 font-medium">
                Your consultation has been successfully scheduled.
              </p>
            </div>

            {/* Structured Ticket Details Card */}
            <div className="bg-[#F8FAFC] border border-[#E4E7EC] p-3.5 rounded-2xl text-left space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-[10px] font-extrabold text-[#0B5A54] uppercase tracking-wider flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-[#0B5A54]" /> Ticket Pass
                </span>
                <span className="text-xs font-extrabold text-[#0B5A54] bg-[#0B5A54]/10 px-2.5 py-0.5 rounded-full">
                  {bookedTicket || 'TK-482'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Physician:</span>
                  <span className="font-bold text-slate-900">{doctor.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Date & Time:</span>
                  <span className="font-bold text-[#0B5A54]">{selectedDate} • {selectedSlot}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Facility:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[180px]">{doctor.hospitalName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Type:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                    In-Person Visit
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-1">
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  navigate('/home');
                }}
                className="py-3 rounded-xl font-bold text-xs shadow-sm"
              >
                Go to Dashboard
              </Button>
              <button
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  navigate('/history');
                }}
                className="text-xs font-bold text-[#0B5A54] hover:underline block mx-auto pt-1"
              >
                View in Appointment History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
