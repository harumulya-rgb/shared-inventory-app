import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Settings, LogOut, ClipboardList, ShieldCheck, Send, Languages } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useProfile } from '../contexts/ProfileContext';
import { useTranslation } from 'react-i18next';

export default function Sidebar({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProfile, isLoading } = useProfile();

  const toggleLanguage = () => {
    const newLang = i18n.resolvedLanguage === 'en' ? 'ms' : 'en';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('nav.materialsView'), path: '/materials', icon: Package },
    { name: t('nav.materialIssue'), path: '/issue', icon: Send },
    { name: t('nav.materialRegister'), path: '/register', icon: ClipboardList },
    { name: t('nav.settings'), path: '/settings', icon: Settings },
  ].filter(item => currentProfile || item.path === '/settings');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className={`glass-panel sidebar ${isOpen ? 'open' : ''}`} style={{
      width: '260px',
      height: 'calc(100vh - 40px)',
      margin: '20px',
      padding: '32px 20px',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      zIndex: 100,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--glass-border)',
      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <style>
        {`
          @media (max-width: 768px) {
            .sidebar {
              margin: 0 !important;
              height: 100vh !important;
              border-radius: 0 !important;
              transform: translateX(-100%);
              border-top: none;
              border-bottom: none;
              border-left: none;
            }
            .sidebar.open {
              transform: translateX(0);
            }
          }
        `}
      </style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px', paddingLeft: '10px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-h) 80% 45%))',
          padding: '10px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 20px hsla(var(--primary-glow))'
        }}>
          <Package size={22} color="#fff" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Shared</h2>
      </div>

      <div style={{ 
        marginBottom: '24px', 
        padding: '16px', 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        transition: 'var(--transition)',
        border: '1px solid var(--glass-border)'
      }}
      onClick={() => { navigate('/settings'); onClose?.(); }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'hsla(var(--primary), 0.3)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
      >
        <div style={{ background: 'hsla(var(--success), 0.1)', padding: '8px', borderRadius: '10px', color: 'hsl(var(--success))' }}>
          <ShieldCheck size={18} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <p style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Estate</p>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isLoading ? '...' : currentProfile ? currentProfile.name : 'Select Estate'}
          </p>
        </div>
      </div>

      <div style={{ 
        marginBottom: '32px', 
        padding: '12px 16px', 
        background: 'rgba(255,255,255,0.03)', 
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        transition: 'var(--transition)',
        border: '1px solid var(--glass-border)'
      }}
      onClick={toggleLanguage}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      >
        <div style={{ background: 'hsla(var(--primary), 0.1)', padding: '8px', borderRadius: '10px', color: 'hsl(var(--primary))' }}>
          <Languages size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{t('common.language')}</p>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
            {i18n.resolvedLanguage === 'en' ? 'English' : 'Melayu'}
          </p>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', fontWeight: 800, letterSpacing: '0.15em', marginBottom: '12px', paddingLeft: '12px' }}>Systems</p>
        
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link 
              key={item.name} 
              to={item.path}
              onClick={onClose}
              className={isActive ? "animate-pulse-slow" : ""}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'white' : 'hsl(var(--text-muted))',
                background: isActive ? 'linear-gradient(90deg, hsla(var(--primary), 0.2), transparent)' : 'transparent',
                borderLeft: isActive ? '3px solid hsl(var(--primary))' : '3px solid transparent',
                fontWeight: isActive ? 600 : 500,
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'hsl(var(--text-main))';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'hsl(var(--text-muted))';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <item.icon size={20} style={{ opacity: isActive ? 1 : 0.7 }} />
              <span style={{ fontSize: '0.95rem' }}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
        <button 
          onClick={handleSignOut}
          className="btn" 
          style={{ 
            width: '100%', 
            justifyContent: 'center', 
            padding: '14px', 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--glass-border)',
            color: 'hsl(var(--text-muted))',
            borderRadius: 'var(--radius-md)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--danger))'; e.currentTarget.style.borderColor = 'hsla(var(--danger), 0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--text-muted))'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
        >
          <LogOut size={18} />
          <span style={{ fontWeight: 600 }}>{t('nav.logout', 'Secure Sign Out')}</span>
        </button>
      </div>
    </aside>
  );
}
