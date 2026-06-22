import React, { Suspense, lazy } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useAuth } from './hooks/useAuth';
import { useAppointmentReminders } from './hooks/useAppointmentReminders';
import NotificationCenter from './components/shared/NotificationCenter';
import TopNav from './components/shared/TopNav';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Hero from './components/landing/Hero';
import Mission from './components/landing/Mission';
import HaircutPricing from './components/landing/HaircutPricing';
import Portfolio from './components/landing/Portfolio';
import Reviews from './components/landing/Reviews';
import FAQSection from './components/landing/FAQSection';
import ContactSection from './components/landing/ContactSection';
import Footer from './components/landing/Footer';
import BackToTop from './components/ui/BackToTop';
import EmailVerificationPrompt from './components/auth/EmailVerificationPrompt';
import WelcomeJourney from './components/auth/WelcomeJourney';

// Lazy load heavy components
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const BookingSystem = lazy(() => import('./components/booking/BookingSystem'));

export default function App() {
  const { user, profile, loading, logout } = useAuth();
  useAppointmentReminders(profile);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-brand-blue selection:text-white">
      <NotificationCenter />
      <TopNav />
      {user && !user.emailVerified && !loading && (
        <EmailVerificationPrompt user={user} logout={logout} />
      )}
      <main className="transition-all duration-500">
        <Hero />
        <Mission />
        
        {/* Conditional Admin Hub */}
        {profile?.role === 'admin' && (
          <div id="admin-hub" className="scroll-mt-32">
            <ErrorBoundary name="AdminDashboard">
              <Suspense fallback={<div className="h-96 flex items-center justify-center bg-slate-50 animate-pulse">Loading Admin Hub...</div>}>
                <AdminDashboard />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
        
        <ErrorBoundary name="BookingSystem">
          <Suspense fallback={<div className="h-96 flex items-center justify-center bg-slate-50 animate-pulse">Loading Booking System...</div>}>
            <BookingSystem profile={profile} />
          </Suspense>
        </ErrorBoundary>

        <WelcomeJourney />
        <HaircutPricing />
        <Portfolio />
        <Reviews />
        <FAQSection />
        <ContactSection />
        <Footer />
      </main>
      <BackToTop />
      <Analytics />
    </div>
  );
}
