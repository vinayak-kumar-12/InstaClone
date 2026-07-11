import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Layouts
import PublicLayout from "./components/PublicLayout";
import ProtectedLayout from "./components/ProtectedLayout";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-loaded views
const Startpage = lazy(() => import("./pages/Start/Startpage"));
const Login = lazy(() => import("./pages/Auth/Login"));
const Signup = lazy(() => import("./pages/Auth/Signup"));
const Hero = lazy(() => import("./pages/Home/Hero"));
const Message = lazy(() => import("./components/SidePages/Message"));
const Search = lazy(() => import("./components/SidePages/Search"));
const Profile = lazy(() => import("./components/SidePages/Profile"));
const Reels = lazy(() => import("./components/SidePages/Reels"));
const Notification = lazy(() => import("./components/SidePages/Notification"));
const Seeting = lazy(() => import("./components/SidePages/Seeting"));
const NotFound = lazy(() => import("./pages/Errors/NotFound"));

// Visual fallback for lazy loading suspenses
const PageLoader = () => (
  <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center">
    <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const App = () => {
  return (
    <ErrorBoundary>
      {/* Toast Notification Configuration */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#18181b",
            color: "#fff",
            border: "1px solid #27272a",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#18181b",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#18181b",
            },
          },
        }}
      />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* PUBLIC ROUTES (Auth Forms) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Startpage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* PROTECTED ROUTES (Dashboard Shell & Features) */}
          <Route element={<ProtectedLayout />}>
            <Route element={<DashboardLayout />}>
              <Route path="/home" element={<Hero />} />
              <Route path="/Message" element={<Message />} />
              <Route path="/Search" element={<Search />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/Reels" element={<Reels />} />
              <Route path="/Notification" element={<Notification />} />
              <Route path="/Setting" element={<Seeting />} />
            </Route>
          </Route>

          {/* CATCH-ALL ERROR 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
