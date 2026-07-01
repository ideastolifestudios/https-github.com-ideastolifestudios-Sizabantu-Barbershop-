import React, { useState, useEffect } from 'react';
import { getAvailableSlots, createBooking } from '../services/bookingEngine';
import { Service, Barber } from '../types/booking';

// --- Temporary Mock Data (Until Admin Panel is built) ---
const MOCK_SERVICES: Service[] = [
  { id: 's1', name: 'Classic Fade', durationMinutes: 30, price: 120, active: true },
  { id: 's2', name: 'Chiskop', durationMinutes: 30, price: 80, active: true },
  { id: 's3', name: 'Haircut & Beard Trim', durationMinutes: 45, price: 180, active: true }
];

const MOCK_BARBERS: Barber[] = [
  {
    id: 'b1', userId: 'u1', name: 'Sipho', servicesProvided: ['s1', 's2', 's3'], active: true,
    // Works Mon-Sat (1-6), Sunday off (0). 9am to 5pm, Lunch 1pm-2pm
    schedule: [0, 1, 2, 3, 4, 5, 6].map(day => ({
      dayOfWeek: day,
      isWorking: day !== 0,
      startTime: '09:00',
      endTime: '17:00',
      lunchStart: '13:00',
      lunchEnd: '14:00'
    }))
  },
  {
    id: 'b2', userId: 'u2', name: 'Thabo', servicesProvided: ['s1', 's2'], active: true,
    schedule: [0, 1, 2, 3, 4, 5, 6].map(day => ({
      dayOfWeek: day,
      isWorking: day !== 0,
      startTime: '10:00',
      endTime: '18:00',
      lunchStart: '14:00',
      lunchEnd: '15:00'
    }))
  }
];

export default function BookingPage() {
  const [step, setStep] = useState(1);
  
  // Booking State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Customer Details State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);

  // Fetch slots when Date, Barber, or Service changes
  useEffect(() => {
    if (selectedBarber && selectedDate && selectedService) {
      getAvailableSlots(selectedBarber, selectedDate, selectedService)
        .then(slots => setAvailableSlots(slots))
        .catch(err => console.error("Error fetching slots:", err));
    }
  }, [selectedBarber, selectedDate, selectedService]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !customerName) return;

    setIsSubmitting(true);
    
    // Calculate End Time based on start time + duration
    const start = new Date(`1970-01-01T${selectedTime}:00`);
    start.setMinutes(start.getMinutes() + selectedService.durationMinutes);
    const endTime = start.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });

    try {
      await createBooking({
        customerId: 'guest', // Update this if using customer auth later
        customerName,
        customerPhone,
        barberId: selectedBarber.id!,
        barberName: selectedBarber.name,
        serviceId: selectedService.id!,
        serviceName: selectedService.name,
        date: selectedDate,
        startTime: selectedTime,
        endTime: endTime,
        totalPrice: selectedService.price,
        notes: ''
      });
      setBookingComplete(true);
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Failed to confirm booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingComplete) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ color: 'green' }}>✅ Booking Confirmed!</h2>
        <p>Thank you, {customerName}. Your appointment with {selectedBarber?.name} for a {selectedService?.name} is set for {selectedDate} at {selectedTime}.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', marginTop: '20px' }}>Book Another</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Book an Appointment</h1>
      <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>Step {step} of 4</div>

      {/* STEP 1: SERVICE */}
      {step === 1 && (
        <div>
          <h3>Select a Service</h3>
          {MOCK_SERVICES.map(service => (
            <div 
              key={service.id} 
              onClick={() => { setSelectedService(service); setStep(2); }}
              style={{ padding: '15px', border: '1px solid #ccc', margin: '10px 0', cursor: 'pointer', borderRadius: '8px' }}
            >
              <strong>{service.name}</strong> - R{service.price} ({service.durationMinutes} min)
            </div>
          ))}
        </div>
      )}

      {/* STEP 2: BARBER */}
      {step === 2 && (
        <div>
          <h3>Select a Barber</h3>
          <button onClick={() => setStep(1)} style={{ marginBottom: '15px' }}>← Back</button>
          {MOCK_BARBERS.filter(b => b.servicesProvided.includes(selectedService!.id!)).map(barber => (
            <div 
              key={barber.id} 
              onClick={() => { setSelectedBarber(barber); setStep(3); }}
              style={{ padding: '15px', border: '1px solid #ccc', margin: '10px 0', cursor: 'pointer', borderRadius: '8px' }}
            >
              <strong>{barber.name}</strong>
            </div>
          ))}
        </div>
      )}

      {/* STEP 3: DATE & TIME */}
      {step === 3 && (
        <div>
          <h3>Select Date & Time</h3>
          <button onClick={() => setStep(2)} style={{ marginBottom: '15px' }}>← Back</button>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Date:</label>
            <input 
              type="date" 
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate} 
              onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }} 
              style={{ padding: '10px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {selectedDate && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Available Times:</label>
              {availableSlots.length === 0 ? (
                <p style={{ color: 'red' }}>No available slots on this date. They might be fully booked or it is their day off.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {availableSlots.map(time => (
                    <button 
                      key={time} 
                      onClick={() => { setSelectedTime(time); setStep(4); }}
                      style={{ padding: '10px', backgroundColor: selectedTime === time ? '#333' : '#f0f0f0', color: selectedTime === time ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 4: CONFIRMATION */}
      {step === 4 && (
        <form onSubmit={handleConfirmBooking}>
          <h3>Confirm Your Booking</h3>
          <button type="button" onClick={() => setStep(3)} style={{ marginBottom: '15px' }}>← Back</button>
          
          <div style={{ padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '20px' }}>
            <p><strong>Service:</strong> {selectedService?.name} (R{selectedService?.price})</p>
            <p><strong>Barber:</strong> {selectedBarber?.name}</p>
            <p><strong>When:</strong> {selectedDate} at {selectedTime}</p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Your Name:</label>
            <input required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ padding: '10px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>WhatsApp / Phone Number:</label>
            <input required type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={{ padding: '10px', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={isSubmitting} style={{ padding: '15px', width: '100%', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
            {isSubmitting ? 'Processing...' : 'Confirm Appointment'}
          </button>
        </form>
      )}
    </div>
  );
}
