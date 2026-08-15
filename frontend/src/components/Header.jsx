import { useEffect, useState } from "react";
import { Menu, Bell, User, PanelLeftOpen, PanelLeftClose} from "lucide-react";

export default function Header({
  user,
  mobileOpen,
  setMobileOpen,
  sidebarWidth,
  isDesktop,
  sidebarOpen,
  setSidebarOpen,
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header
      className="
        fixed
        top-0
        right-0
        z-40
        h-20
        border-b
        border-slate-200/80
        bg-white/90
        backdrop-blur-xl
        shadow-sm
        transition-all
        duration-300
      "
      style={{
        left: isDesktop ? sidebarWidth : 0,
      }}
    >
      <div className="flex h-full items-center justify-between px-6">

        {/* Left */}
        <div className="flex items-center gap-3">

  {/* Mobile */}
  <button
    type="button"
    onClick={() => setMobileOpen(!mobileOpen)}
    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition hover:bg-slate-100 lg:hidden"
  >
    <Menu size={20} />
  </button>

  {/* Desktop Sidebar Toggle */}
  <button
    type="button"
    onClick={() => setSidebarOpen((prev) => !prev)}
    className="
      hidden
      lg:flex
      h-11
      w-11
      items-center
      justify-center
      rounded-xl
      border
      border-slate-200
      bg-white
      shadow-sm
      transition
      hover:bg-brand-600
      hover:text-white
    "
  >
    {sidebarOpen ? (
      <PanelLeftClose size={20} />
    ) : (
      <PanelLeftOpen size={20} />
    )}
  </button>

  <div>
    <p className="text-sm text-slate-500">
      Selamat Datang 👋
    </p>

    <h1 className="text-xl font-bold text-slate-900">
      {user?.name ?? "User"}
    </h1>
  </div>

</div>

        {/* Right */}
        <div className="flex items-center gap-4">

          {/* Date */}
          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-slate-700">
              {now.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>

            <p className="text-xs text-slate-500">
              {now.toLocaleTimeString("id-ID")}
            </p>
          </div>

          {/* Notification */}
          <button
            className="
              relative
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              transition
              hover:bg-slate-100
            "
          >
            <Bell size={20} />

            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>

          {/* Avatar */}
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              bg-gradient-to-br
              from-brand-600
              to-brand-500
              text-white
              shadow-md
            "
          >
            <User size={18} />
          </div>
          
        </div>

      </div>
    </header>
  );
}