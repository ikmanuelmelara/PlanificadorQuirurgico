import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

// Default cutoff: 4 weeks from now
function defaultCutoffDate() {
  const d = new Date();
  d.setDate(d.getDate() + 28);
  return d;
}

export default function MainLayout() {
  const [cutoffDate, setCutoffDate] = useState(defaultCutoffDate);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-64">
        <Header cutoffDate={cutoffDate} onCutoffDateChange={setCutoffDate} />
        <main className="p-6">
          <Outlet context={{ cutoffDate }} />
        </main>
      </div>
    </div>
  );
}
