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
      <div
        className="
          flex
          h-full
          w-full
          items-center
          justify-between
          gap-4
          px-4
          sm:px-6
        "
      >

        {/* =========================================================
            LEFT
        ========================================================= */}
        <div
          className="
            flex
            min-w-0
            items-center
            gap-1.5
            text-xs
            text-slate-500
            sm:gap-2
            sm:text-sm
          "
        >
          {/* Copyright */}
          <span className="shrink-0">
            © {new Date().getFullYear()}
          </span>

          {/* Brand */}
          <span className="shrink-0 font-semibold text-brand-600">
            FamFin
          </span>

          {/* Description - Desktop */}
          <span className="hidden truncate lg:inline">
            • Family Finance Management System
          </span>
        </div>

        {/* =========================================================
            RIGHT
        ========================================================= */}
        <div
          className="
            hidden
            shrink-0
            items-center
            gap-2
            text-xs
            text-slate-500
            lg:flex
            xl:text-sm
          "
        >
          {/* Version */}
          <span>
            Version
          </span>

          <span
            className="
              rounded-full
              bg-slate-100
              px-2
              py-0.5
              font-medium
              text-slate-600
            "
          >
            v1.0.0
          </span>

          {/* Separator */}
          <span className="mx-1 text-slate-300">
            |
          </span>

          {/* Created By */}
          <span>
            Created by
          </span>

          <span className="font-semibold text-brand-600">
            FamFin Team
          </span>
        </div>

      </div>
    </footer>
  );
}