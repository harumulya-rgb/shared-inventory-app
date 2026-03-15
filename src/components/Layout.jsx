import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="layout-root" style={{ display: 'flex', minHeight: '100vh', background: 'hsl(var(--bg-dark))' }}>
      <div className="ambient-light ambient-1"></div>
      <div className="ambient-light ambient-2"></div>
      
      <Sidebar />
      
      <main style={{ 
        flex: 1, 
        marginLeft: '280px', 
        padding: '40px', 
        maxWidth: '1400px',
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="animate-slide-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
