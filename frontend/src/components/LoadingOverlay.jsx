export default function LoadingOverlay({
  loading,
  title = "Memuat Data",
  message = "Mohon tunggu sebentar...",
}) {
  if (!loading) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-slate-900/10
        px-4
        backdrop-blur-[2px]
      "
    >
      <div
        className="
          w-full
          max-w-[360px]
          rounded-3xl
          border
          border-slate-200/80
          bg-white
          p-6
          shadow-2xl
          sm:p-8
        "
      >
        <div className="flex flex-col items-center text-center">

          {/* Spinner */}
          <div className="relative mb-5 h-14 w-14 sm:h-16 sm:w-16">

            <div
              className="
                absolute
                inset-0
                rounded-full
                border-4
                border-slate-200
              "
            />

            <div
              className="
                absolute
                inset-0
                animate-spin
                rounded-full
                border-4
                border-transparent
                border-t-brand-600
                border-r-brand-500
              "
            />

            <div
              className="
                absolute
                left-1/2
                top-1/2
                h-2.5
                w-2.5
                -translate-x-1/2
                -translate-y-1/2
                rounded-full
                bg-brand-600
                sm:h-3
                sm:w-3
              "
            />
          </div>

          {/* Title */}
          <h2 className="text-base font-semibold text-slate-800 sm:text-lg">
            {title}
          </h2>

          {/* Message */}
          <p className="mt-2 max-w-[280px] text-center text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
            {message}
          </p>

          {/* Loading dots */}
          <div className="mt-5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600 sm:h-2 sm:w-2" />

            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600 sm:h-2 sm:w-2"
              style={{ animationDelay: "0.15s" }}
            />

            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600 sm:h-2 sm:w-2"
              style={{ animationDelay: "0.3s" }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}