import React, { useState, useEffect, useRef } from 'react';
import { recommendationService, ConsultationProfile } from '../services/recommendationService';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export const CustomerSupportChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Yo! Welcome to Sizabantu Barbershop support. Looking for a fresh look or need help booking your slot? Click below for an instant style consultation!',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Consultation Workflow State
  const [consultationMode, setConsultationMode] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<'faceShape' | 'hairTexture' | 'maintenance' | 'length'>('faceShape');
  const [profile, setProfile] = useState<ConsultationProfile>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, consultationMode]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    if (!textToSend) setInputValue('');

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Simulate or hook into standard message processing if needed
      // For now, handling generic fallback text conversation cleanly
      setTimeout(() => {
        const aiMsg: Message = {
          id: Math.random().toString(),
          sender: 'ai',
          text: "Thanks for reaching out! To get tailored style advice, try out our interactive Style Consultation button above.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      setIsLoading(false);
    }
  };

  const startConsultation = () => {
    setConsultationMode(true);
    setCurrentStep('faceShape');
    setProfile({});
  };

  const handleSelectOption = async (field: keyof ConsultationProfile, value: string) => {
    const updatedProfile = { ...profile, [field]: value };
    setProfile(updatedProfile);

    if (field === 'faceShape') {
      setCurrentStep('hairTexture');
    } else if (field === 'hairTexture') {
      setCurrentStep('maintenance');
    } else if (field === 'maintenanceLevel') {
      setCurrentStep('length');
    } else if (field === 'currentLength') {
      setConsultationMode(false);
      setIsLoading(true);

      // Print selection context cleanly in user chat window
      const summaryText = `👉 Consultation Requested:\n• Face: ${updatedProfile.faceShape}\n• Texture: ${updatedProfile.hairTexture}\n• Maintenance: ${updatedProfile.maintenanceLevel}\n• Length: ${updatedProfile.currentLength}`;
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), sender: 'user', text: summaryText, timestamp: new Date() }
      ]);

      try {
        const recommendation = await recommendationService.getHairstyleRecommendation(updatedProfile);
        setMessages((prev) => [
          ...prev,
          { id: Math.random().toString(), sender: 'ai', text: recommendation, timestamp: new Date() }
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          { id: Math.random().toString(), sender: 'ai', text: "Error running engine. Let's try that consultation again later!", timestamp: new Date() }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'sans-serif' }}>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#d97706',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
      )}

      {/* Chat Windows Box (Dark Theme Aligned) */}
      {isOpen && (
        <div style={{
          width: '360px',
          height: '500px',
          backgroundColor: '#1e1e1e',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #333',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '16px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>Sizabantu AI Stylist</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '18px' }}>&times;</button>
          </div>

          {/* Messages Flow Area */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: msg.sender === 'user' ? '#d97706' : '#2d2d2d',
                  color: '#fff',
                  border: msg.sender === 'user' ? 'none' : '1px solid #3c3c3c'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {/* Interactive Guided Selector Mode */}
            {consultationMode && (
              <div style={{ backgroundColor: '#252526', border: '1px dashed #d97706', borderRadius: '8px', padding: '12px', marginTop: '4px' }}>
                {currentStep === 'faceShape' && (
                  <>
                    <p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 8px 0' }}>Step 1: Choose your face shape</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Oval', 'Round', 'Square', 'Long/Angular'].map((opt) => (
                        <button key={opt} onClick={() => handleSelectOption('faceShape', opt)} style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#333', color: '#fff', cursor: 'pointer' }}>{opt}</button>
                      ))}
                    </div>
                  </>
                )}
                {currentStep === 'hairTexture' && (
                  <>
                    <p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 8px 0' }}>Step 2: Choose your hair texture</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Straight', 'Wavy', 'Curly', 'Coily/Kinky'].map((opt) => (
                        <button key={opt} onClick={() => handleSelectOption('hairTexture', opt)} style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#333', color: '#fff', cursor: 'pointer' }}>{opt}</button>
                      ))}
                    </div>
                  </>
                )}
                {currentStep === 'maintenance' && (
                  <>
                    <p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 8px 0' }}>Step 3: Desired maintenance level</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Low (Wash & Go)', 'Medium (Basic Styling)', 'High (Daily Overhead)'].map((opt) => (
                        <button key={opt} onClick={() => handleSelectOption('maintenanceLevel', opt)} style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#333', color: '#fff', cursor: 'pointer' }}>{opt}</button>
                      ))}
                    </div>
                  </>
                )}
                {currentStep === 'length' && (
                  <>
                    <p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 8px 0' }}>Step 4: Current Hair Length</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Very Short/Buzzed', 'Short', 'Medium', 'Long'].map((opt) => (
                        <button key={opt} onClick={() => handleSelectOption('currentLength', opt)} style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#333', color: '#fff', cursor: 'pointer' }}>{opt}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {isLoading && (
              <div style={{ alignSelf: 'flex-start', color: '#aaa', fontSize: '11px', fontStyle: 'italic', paddingLeft: '4px' }}>
                AI Stylist is analyzing profile data...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Consultation CTA Block */}
          {!consultationMode && !isLoading && (
            <div style={{ padding: '0 16px 8px 16px' }}>
              <button
                onClick={startConsultation}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  backgroundColor: 'transparent',
                  color: '#d97706',
                  border: '1px solid #d97706',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(217,119,6,0.1)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ✂️ Start Free Hair Consultation
              </button>
            </div>
          )}

          {/* Text Input Row */}
          <div style={{ padding: '12px', borderTop: '1px solid #333', display: 'flex', gap: '8px', backgroundColor: '#1a1a1a' }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              disabled={consultationMode}
              style={{
                flex: 1,
                backgroundColor: '#2d2d2d',
                border: '1px solid #444',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={consultationMode || !inputValue.trim()}
              style={{
                backgroundColor: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 14px',
                cursor: 'pointer',
                opacity: (consultationMode || !inputValue.trim()) ? 0.5 : 1
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSupportChat;
