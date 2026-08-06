export default function Footer({
  sidebarWidth,
  isDesktop,
}) {
  return (
    <footer
      className="
        fixed
        bottom-0
        right-0
        z-30
        h-16
        border-t
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
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>© {new Date().getFullYear()}</span>

          <span className="font-semibold text-brand-600">
            FamFin
          </span>

          <span className="hidden lg:inline">
            • Family Finance Management System
          </span>
        </div>

        {/* Right */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500">

          <span>
            Version
          </span>

          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            v1.0.0
          </span>

          <span className="mx-1 text-slate-300">|</span>

          <span>
            Made with ❤️ by
          </span>

          <span className="font-semibold text-brand-600">
            FamFin Team
          </span>

        </div>

      </div>
    </footer>
  );
}