import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase-config';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, revenue: 0, popularService: 'N/A' });

  useEffect(() => {
    // 1. Query the bookings collection, newest first
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    
    // 2. Set up the real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveBookings: any[] = [];
      let totalRev = 0;
      const serviceCounts: Record<string, number> = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        liveBookings.push({ id: doc.id, ...data });
        
        // Calculate basic stats for active/completed bookings
        if (data.status !== 'cancelled' && data.status !== 'expired') {
           totalRev += data.price || 150; // Placeholder 150 ZAR if no price set
           const srv = data.service || 'Haircut';
           serviceCounts[srv] = (serviceCounts[srv] || 0) + 1;
        }
      });
      
      // Determine most popular service
      let popService = 'N/A';
      let maxCount = 0;
      for (const [srv, count] of Object.entries(serviceCounts)) {
        if (count > maxCount) { maxCount = count; popService = srv; }
      }

      setBookings(liveBookings);
      setStats({ total: liveBookings.length, revenue: totalRev, popularService: popService });
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-100 text-slate-800 flex flex-col min-h-screen">
        <div className="p-6 text-center border-b border-slate-100">
          <h1 className="text-xl font-black text-red-500 uppercase tracking-widest">
            Sizabantu <span className="text-blue-500 italic lowercase font-serif">Admin</span>
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <p className="text-xs text-slate-400 font-black tracking-widest text-[9px] font-bold uppercase tracking-wider mb-4 mt-4">Analytics</p>
          <SidebarButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon="📊">Overview</SidebarButton>
          <p className="text-xs text-slate-400 font-black tracking-widest text-[9px] font-bold uppercase tracking-wider mb-4 mt-8">Management</p>
          <SidebarButton active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} icon="📅">Live Bookings</SidebarButton>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 h-screen overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 font-bold text-slate-800 capitalize">{activeTab}</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-green-500">Live Sync Active 🟢</span>
            <div className="w-10 h-10 bg-slate-50 text-brand-blue rounded-full flex items-center justify-center text-white font-bold">A</div>
          </div>
        </header>

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Active Bookings" value={stats.total} />
            <StatCard title="Estimated Revenue" value={`R ${stats.revenue}`} highlight className="text-green-600" />
            <StatCard title="Most Popular Service" value={stats.popularService} />
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Mission Control</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-black tracking-widest text-[9px] text-sm uppercase">
                    <th className="p-4 border-b">Client</th>
                    <th className="p-4 border-b">Service</th>
                    <th className="p-4 border-b">Date & Time</th>
                    <th className="p-4 border-b">Status</th>
                    <th className="p-4 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                      <td className="p-4 font-medium text-slate-800">{b.userName || b.customerName || 'Walk-in'}</td>
                      <td className="p-4 text-slate-600">{b.service || 'Haircut'}</td>
                      <td className="p-4 text-slate-600">{b.date} • {b.time}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          b.status === 'confirmed' ? 'bg-green-100 text-green-800 border border-green-200' :
                          b.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          b.status === 'completed' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 flex space-x-2">
                        {b.status === 'pending' && <button className="text-green-600 hover:bg-green-50 px-3 py-1 rounded border border-green-200 text-sm font-bold shadow-sm">Confirm</button>}
                        {b.status === 'confirmed' && <button className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded border border-blue-200 text-sm font-bold shadow-sm">Check-in</button>}
                        {b.status === 'checked-in' && <button className="text-purple-600 hover:bg-purple-50 px-3 py-1 rounded border border-purple-200 text-sm font-bold shadow-sm">Start</button>}
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-black tracking-widest text-[9px] font-medium">No bookings found. Waiting for live data...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, children }: any) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-lg flex items-center space-x-3 transition-all ${active ? 'bg-blue-600 text-white font-bold shadow-lg transform scale-105' : 'text-slate-400 hover:bg-slate-50 text-brand-blue hover:text-white'}`}>
      <span className="text-xl">{icon}</span><span>{children}</span>
    </button>
  );
}

function StatCard({ title, value, className = "text-slate-800" }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h4>
      <p className={`text-xl font-black uppercase tracking-tight text-slate-800 font-black ${className}`}>{value}</p>
    
      {/* Supercharged Executive AI Intelligence Portal */}
      
</div>
  );
}
