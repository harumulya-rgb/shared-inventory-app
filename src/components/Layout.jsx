import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="layout-root" style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg-dark))' }}>
      <div className="ambient-light ambient-1"></div>
      <div className="ambient-light ambient-2"></div>
      
      {/* Mobile Toggle Button */}
      <button 
        className="show-mobile"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'hsl(var(--primary))',
          border: 'none',
          color: 'white',
          padding: '10px',
          borderRadius: '12px',
          boxShadow: '0 8px 20px hsla(var(--primary-glow))'
        }}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 90
          }}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="main-content" style={{ 
        flex: 1, 
        marginLeft: '280px', 
        padding: '40px', 
        maxWidth: '1400px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
        transition: 'var(--transition)'
      }}>
        <style>
          {`
            @media (max-width: 768px) {
              .main-content {
                margin-left: 0 !important;
                padding: 80px 16px 40px 16px !important;
              }
            }
          `}
        </style>
        <div className="animate-slide-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
