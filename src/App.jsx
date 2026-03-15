import { Routes, Route } from 'react-router-dom';
import AuthWrapper from './components/AuthWrapper';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MaterialsView from './pages/MaterialsView';
import MaterialRegister from './pages/MaterialRegister';
import MaterialIssue from './pages/MaterialIssue';
import Settings from './pages/Settings';
import { ProfileProvider } from './contexts/ProfileContext';

function App() {
  return (
    <AuthWrapper>
      <ProfileProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/materials" element={<MaterialsView />} />
            <Route path="/issue" element={<MaterialIssue />} />
            <Route path="/register" element={<MaterialRegister />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </ProfileProvider>
    </AuthWrapper>
  );
}

export default App;
