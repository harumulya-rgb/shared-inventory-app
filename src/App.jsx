import { Routes, Route } from 'react-router-dom';
import AuthWrapper from './components/AuthWrapper';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MaterialsView from './pages/MaterialsView';
import MaterialRegister from './pages/MaterialRegister';
import MaterialIssue from './pages/MaterialIssue';
import Settings from './pages/Settings';
import { ProfileProvider } from './contexts/ProfileContext';

import { useProfile } from './contexts/ProfileContext';

function AppContent() {
  const { currentProfile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Initializing ecosystem...</p>
      </div>
    );
  }

  // If no active profile, force user to Settings to create or join one
  if (!currentProfile) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<Settings />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/materials" element={<MaterialsView />} />
        <Route path="/issue" element={<MaterialIssue />} />
        <Route path="/register" element={<MaterialRegister />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthWrapper>
      <ProfileProvider>
        <AppContent />
      </ProfileProvider>
    </AuthWrapper>
  );
}

export default App;
