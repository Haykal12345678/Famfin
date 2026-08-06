import { NavLink } from "react-router-dom";
import {Building2, LogOut, X} from "lucide-react";

export default function Sidebar({
  open,
  mobileOpen,
  setMobileOpen,
  setSidebarOpen,
  menu,
  user,
  currentTenant,
  onLogout,
  handleSidebarMouseEnter,
  handleSidebarMouseLeave,
}) {
  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? "visible opacity-100"
            : "invisible opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-screen
          flex-col
          overflow-hidden
          bg-gradient-to-b
          from-brand-700
          via-brand-600
          to-brand-500
          text-white
          shadow-2xl
          transition-[width,transform]
          duration-300
          ease-in-out
          ${open ? "w-72" : "w-20"}
          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* Header */}
        <div
          className={`
            relative
            flex
            h-20
            items-center
            border-b
            border-white/10
            ${open ? "justify-between px-5" : "justify-center"}
          `}
        >
          {open ? (
            <div className="overflow-hidden">
              <h1 className="whitespace-nowrap text-2xl font-bold">
                FamFin
              </h1>

              <p className="whitespace-nowrap text-xs text-white/70">
                Family Finance Management
              </p>
            </div>
          ) : (
            <div className="text-3xl">💰</div>
          )}

          {/* Mobile Close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `
                    group
                    mb-2
                    flex
                    items-center
                    rounded-xl
                    transition-all
                    duration-200
                    ${
                      open
                        ? "gap-3 px-4 py-3"
                        : "justify-center p-3"
                    }
                    ${
                      isActive
                        ? "bg-white text-brand-700 shadow-md"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }
                  `
                }
              >
                <Icon
                  size={20}
                  className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                />

                {open && (
                  <span className="truncate font-medium">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-white/10 p-4">
          {open && (
            <div className="mb-4 rounded-xl bg-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                  <Building2 size={20} />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {user?.name}
                  </p>

                  <p className="truncate text-xs text-white/70">
                    {currentTenant?.name}
                  </p>

                  <p className="truncate text-xs text-white/50">
                    {currentTenant?.role}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            className={`
              flex
              w-full
              items-center
              justify-center
              rounded-xl
              bg-red-500/20
              py-3
              transition-all
              duration-200
              hover:bg-red-500
              ${
                open
                  ? "gap-2"
                  : ""
              }
            `}
          >
            <LogOut size={18} />

            {open && (
              <span className="font-medium">
                Keluar
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}