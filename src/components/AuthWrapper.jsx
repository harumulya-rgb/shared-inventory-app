import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Login from './Login';

export default function AuthWrapper({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Checking authentication...</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  // Pass session down to children if needed, or children can fetch from supabase.auth
  return children;
}
