import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/stock/TopNav';

export default function Settings() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to warehouse page by default
    navigate('/settings/warehouse', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav />
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-slate-400">Redirecting...</p>
        </div>
      </div>
    </div>
  );
}

