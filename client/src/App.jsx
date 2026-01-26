import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import InquiryList from './components/InquiryList';
import ChatArea from './components/ChatArea';
import CustomerProfile from './components/CustomerProfile';
import DashboardStats from './components/DashboardStats';
import CustomersView from './components/CustomersView';
import SettingsPage from './components/SettingsPage';

import { API_URL } from './config';

function App() {
  const [stats, setStats] = useState({ goldRate: 0, qualifiedleads: 0 });
  const [pending, setPending] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activePage, setActivePage] = useState('inbox'); // 'dashboard', 'inbox', 'customers', 'settings'
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [inquiryWidth, setInquiryWidth] = useState(320);

  // Dark Mode Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchData = async () => {
    setLoading(true); // Added this line as per instruction's implied change
    try {
      const statsRes = await fetch(`${API_URL}/api/dashboard/stats`);
      const statsData = await statsRes.json();
      setStats(statsData);

      const pendingRes = await fetch(`${API_URL}/api/dashboard/pending`);
      const pendingData = await pendingRes.json();
      setPending(pendingData);

      const allCustRes = await fetch(`${API_URL}/api/dashboard/all-customers`);
      const allCustData = await allCustRes.json();
      setAllCustomers(allCustData);

      // Auto-select first if none selected and in inbox
      if (!selectedId && pendingData.length > 0 && activePage === 'inbox') {
        // setSelectedId(pendingData[0].id);
      }
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [activePage]);

  // Handle Approval
  const handleApprove = async (id, finalPrice) => {
    await fetch(`${API_URL}/api/dashboard/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, finalPrice })
    });
    alert("Estimate Approved! Notification Sent.");

    // Remove from pending
    setPending(pending.filter(p => p.id !== id));
    setSelectedId(null);
    setActivePage('dashboard');
  };

  const handleNudge = async (id) => {
    await fetch(`${API_URL}/api/dashboard/nudge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, force: true }) // Force nudge for demo
    });
    alert("Nudge Sent!");
  };

  const selectedItem = pending.find(p => p.id === selectedId);

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-[#1a1a1a] text-gold">Loading...</div>;

  return (
    <div className="flex h-screen bg-jewelry-dark font-sans text-gray-200 transition-colors duration-300">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Render View Based on activePage */}
      {activePage === 'dashboard' && (
        <DashboardStats stats={stats} pending={pending} />
      )}

      {activePage === 'customers' && (
        <CustomersView customers={allCustomers} />
      )}

      {activePage === 'inbox' && (
        <>
          <InquiryList
            requests={pending}
            selectedId={selectedId}
            onSelect={(item) => setSelectedId(item.id)}
            width={inquiryWidth}
            setWidth={setInquiryWidth}
          />
          <ChatArea
            selectedItem={selectedItem}
            onApprove={handleApprove}
            onNudge={handleNudge}
          />
          <CustomerProfile
            selectedItem={selectedItem}
            allRequests={pending.filter(p => selectedItem && p.customer === selectedItem.customer)}
            darkMode={darkMode}
            toggleDarkMode={() => setDarkMode(!darkMode)}
          />
        </>
      )}

      {activePage === 'settings' && (
        <SettingsPage />
      )}
    </div>
  );
}

export default App;
