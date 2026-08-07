import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useLoading } from "../context/LoadingContext";

import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import LoadingOverlay from "./LoadingOverlay";
import { menu } from "./Menu";

export default function Layout({ children }) {
  const { user, tenants, activeTenantId, logout } = useAuth();
  const { loading } = useLoading();

  const navigate = useNavigate();

  // Sidebar
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Responsive
  const [isDesktop, setIsDesktop] = useState(
    window.innerWidth >= 1024
  );

  const hoverTimer = useRef();

  const open = sidebarPinned || hoverOpen;

  const sidebarWidth = isDesktop
    ? open
      ? 288
      : 80
    : 0;

  const currentTenant =
    tenants.find((t) => t.id === activeTenantId) || null;

  useEffect(() => {
    const resize = () => {
      setIsDesktop(window.innerWidth >= 1024);

      if (window.innerWidth < 1024) {
        setHoverOpen(false);
      }
    };

    resize();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      clearTimeout(hoverTimer.current);
    };
  }, []);

  const handleSidebarMouseEnter = () => {
    if (!isDesktop || sidebarPinned) return;

    clearTimeout(hoverTimer.current);

    hoverTimer.current = setTimeout(() => {
      setHoverOpen(true);
    }, 150);
  };

  const handleSidebarMouseLeave = () => {
    if (!isDesktop || sidebarPinned) return;

    clearTimeout(hoverTimer.current);

    hoverTimer.current = setTimeout(() => {
      setHoverOpen(false);
    }, 150);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        open={open}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        setSidebarOpen={setSidebarPinned}
        menu={menu}
        user={user}
        currentTenant={currentTenant}
        onLogout={handleLogout}
        handleSidebarMouseEnter={handleSidebarMouseEnter}
        handleSidebarMouseLeave={handleSidebarMouseLeave}
      />

      <main
  className="flex min-h-screen flex-col transition-all duration-300"
  style={{
    marginLeft: sidebarWidth,
  }}
>
  <Header
    user={user}
    mobileOpen={mobileOpen}
    setMobileOpen={setMobileOpen}
    sidebarWidth={sidebarWidth}
    isDesktop={isDesktop}
    sidebarOpen={sidebarPinned}
    setSidebarOpen={setSidebarPinned}
  />

  {/* Body */}
  <section className="relative flex-1">

    {/* Content */}
    <div className="h-full overflow-y-auto px-6 pt-24 pb-20">

      <div className="mx-auto w-full max-w-screen-2xl">
        {children}
      </div>

    </div>

    {/* Loading Overlay */}
    <LoadingOverlay loading={loading} />

  </section>

  <Footer
    sidebarWidth={sidebarWidth}
    isDesktop={isDesktop}
  />
      </main>
    </div>
  );
}