import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { Loader } from "./components/ui/Loader";

// Lazy load dashboard components to reduce initial bundle size and improve LCP
const DashboardLayout = React.lazy(() => import("./components/layout/DashboardLayout").then(module => ({ default: module.DashboardLayout })));
const Dashboard = React.lazy(() => import("./pages/Dashboard").then(module => ({ default: module.Dashboard })));
const History = React.lazy(() => import("./pages/History").then(module => ({ default: module.History })));
const Reports = React.lazy(() => import("./pages/Reports").then(module => ({ default: module.Reports })));
const Alerts = React.lazy(() => import("./pages/Alerts").then(module => ({ default: module.Alerts })));
const Settings = React.lazy(() => import("./pages/Settings").then(module => ({ default: module.Settings })));
const SingleAnalysis = React.lazy(() => import("./pages/SingleAnalysis").then(module => ({ default: module.SingleAnalysis })));

const FallbackLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Loader size={32} />
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<FallbackLoader />}>
        <Routes>
          {/* Landing page (eager loaded for LCP) */}
          <Route path="/" element={<LandingPage />} />

          {/* Dashboard routes (lazy loaded) */}
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
      </Suspense>
    </ErrorBoundary>
  );
}

