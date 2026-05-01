import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { History } from "./pages/History";
import { Reports } from "./pages/Reports";
import { Alerts } from "./pages/Alerts";
import { Settings } from "./pages/Settings";
import { SingleAnalysis } from "./pages/SingleAnalysis";
import LandingPage from "./pages/LandingPage";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="reports" element={<Reports />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="settings" element={<Settings />} />
          <Route path="analysis" element={<SingleAnalysis />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}

