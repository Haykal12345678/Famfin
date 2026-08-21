import { useEffect, useState } from "react";
import {
  Menu,
  Bell,
  User,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";

export default function Header({
  user,
  mobileOpen,
  setMobileOpen,
  sidebarWidth,
  isDesktop,
  sidebarPinned,
  setSidebarPinned,
}) {
  const [now, setNow] = useState(new Date());

  /*
  |--------------------------------------------------------------------------
  | Live Date & Time
  |--------------------------------------------------------------------------
  */

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
        transition-[left]
        duration-300
        ease-in-out
      "
      style={{
        left: isDesktop ? sidebarWidth : 0,
      }}
    >
      <div className="flex h-full items-center justify-between px-4 sm:px-6">

        {/* ================================================================
            LEFT
        ================================================================= */}

        <div className="flex min-w-0 items-center gap-3">

          {/* --------------------------------------------------------------
              Mobile Sidebar Toggle
          -------------------------------------------------------------- */}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={
              mobileOpen
                ? "Tutup menu"
                : "Buka menu"
            }
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              text-slate-700
              shadow-sm
              transition
              hover:bg-slate-100
              active:scale-95
              lg:hidden
            "
          >
            <Menu size={20} />
          </button>

          {/* --------------------------------------------------------------
              Desktop Sidebar Pin / Unpin
          -------------------------------------------------------------- */}

          <button
            type="button"
            onClick={() =>
              setSidebarPinned((prev) => !prev)
            }
            aria-label={
              sidebarPinned
                ? "Tutup sidebar"
                : "Buka sidebar"
            }
            className="
              hidden
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              text-slate-700
              shadow-sm
              transition
              hover:bg-brand-600
              hover:text-white
              active:scale-95
              lg:flex
            "
          >
            {sidebarPinned ? (
              <PanelLeftClose size={20} />
            ) : (
              <PanelLeftOpen size={20} />
            )}
          </button>

          {/* --------------------------------------------------------------
              Welcome
          -------------------------------------------------------------- */}

          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500 sm:text-sm">
              Selamat Datang 👋
            </p>

            <h1 className="truncate text-base font-bold text-slate-900 sm:text-xl">
              {user?.name ?? "User"}
            </h1>
          </div>

        </div>

        {/* ================================================================
            RIGHT
        ================================================================= */}

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">

          {/* --------------------------------------------------------------
              Date & Time
          -------------------------------------------------------------- */}

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

          {/* --------------------------------------------------------------
              Notification
          -------------------------------------------------------------- */}

          <button
            type="button"
            aria-label="Notifikasi"
            className="
              relative
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              text-slate-700
              shadow-sm
              transition
              hover:bg-slate-100
              active:scale-95
              sm:h-11
              sm:w-11
            "
          >
            <Bell size={20} />

            {/* Notification Indicator */}
            <span
              className="
                absolute
                right-2.5
                top-2.5
                h-2.5
                w-2.5
                rounded-full
                bg-red-500
                ring-2
                ring-white
              "
            />
          </button>

          {/* --------------------------------------------------------------
              Avatar
          -------------------------------------------------------------- */}

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-gradient-to-br
              from-brand-600
              to-brand-500
              text-white
              shadow-md
              sm:h-11
              sm:w-11
            "
            title={user?.name ?? "User"}
          >
            <User size={18} />
          </div>

        </div>

      </div>
    </header>
  );
}