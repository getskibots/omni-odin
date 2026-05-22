import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell from './components/DashboardShell';
import Knowledge from './pages/Knowledge';
import Placeholder from './pages/Placeholder';

export default function App() {
  return (
    <DashboardShell>
      <Routes>
        <Route path="/" element={<Navigate to="/knowledge" replace />} />
        <Route path="/knowledge" element={<Knowledge />} />
        <Route path="/analytics" element={<Placeholder title="Analytics" />} />
        <Route path="/support" element={<Placeholder title="Support" />} />
        <Route path="/ai-edits" element={<Placeholder title="AI Edits" />} />
        <Route path="/flows" element={<Placeholder title="Flows" />} />
        <Route path="/actions" element={<Placeholder title="Actions" />} />
        <Route path="/triggers" element={<Placeholder title="Triggers" />} />
        <Route path="/channels" element={<Placeholder title="Channels" />} />
        <Route path="/channels/chat" element={<Placeholder title="Chat channel" />} />
        <Route path="/channels/voice" element={<Placeholder title="Voice channel" />} />
        <Route path="/channels/email" element={<Placeholder title="Email channel" />} />
        <Route path="/settings" element={<Placeholder title="Settings" />} />
        <Route path="/help" element={<Placeholder title="Help" />} />
        <Route path="*" element={<Navigate to="/knowledge" replace />} />
      </Routes>
    </DashboardShell>
  );
}
