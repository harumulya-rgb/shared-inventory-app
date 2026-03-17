import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Lock, Mail, AlertCircle, CheckCircle2, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ms' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });
        if (error) throw error;
        setMessage(t('login.successCheckEmail', 'Success! Please check your email for the confirmation link.'));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '40px', position: 'relative' }}>
        
        <button 
          onClick={toggleLanguage}
          style={{ 
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid var(--glass-border)',
            color: 'var(--text-secondary)',
            padding: '6px 12px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
        >
          <Languages size={14} />
          {i18n.language === 'en' ? 'Bahasa Melayu' : 'English'}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Package size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>{isSignUp ? t('login.createAccount') : t('login.title')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? t('login.joinNetwork', 'Join the Shared Inventory network') : t('login.subtitle')}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(218, 54, 51, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {message && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        <form onSubmit={handleAuth}>
          {isSignUp && (
            <div className="input-group">
              <label className="input-label">{t('login.username', 'Username')}</label>
              <div style={{ position: 'relative' }}>
                <Package size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="estate_manager" 
                  style={{ width: '100%', paddingLeft: '40px' }} 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">{t('login.email')}</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-secondary)' }} />
              <input 
                type="email" 
                className="input-field" 
                placeholder="you@estate.com" 
                style={{ width: '100%', paddingLeft: '40px' }} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label className="input-label">{t('login.password')}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-secondary)' }} />
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                style={{ width: '100%', paddingLeft: '40px' }} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }}
            disabled={loading}
          >
            {loading ? t('login.signingIn') : (isSignUp ? t('login.signUp') : t('login.signIn'))}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isSignUp ? t('login.alreadyHaveAccount', 'Already have an account?') : t('login.noAccount')}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'underline', marginLeft: '8px', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            {isSignUp ? t('login.signIn') : t('login.signUp')}
          </button>
        </p>

      </div>
    </div>
  );
}
