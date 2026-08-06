export default function LoadingOverlay({
  loading,
  title = "Memuat Data",
  message = "Mohon tunggu sebentar...",
}) {
  if (!loading) return null;

  return (
    <div
      className="
        absolute
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-white/40
        backdrop-blur-sm
        animate-in
        fade-in
        duration-200
      "
    >
      <div
        className="
          w-full
          max-w-sm
          rounded-3xl
          border
          border-slate-200
          bg-white
          p-8
          shadow-2xl
        "
      >
        <div className="flex flex-col items-center">

          {/* Spinner */}
          <div className="relative mb-6 h-16 w-16">

            <div className="absolute inset-0 rounded-full border-4 border-slate-200" />

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
                h-3
                w-3
                -translate-x-1/2
                -translate-y-1/2
                rounded-full
                bg-brand-600
              "
            />
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-slate-800">
            {title}
          </h2>

          {/* Message */}
          <p className="mt-2 text-center text-sm leading-6 text-slate-500">
            {message}
          </p>

          {/* Loading Dots */}
          <div className="mt-5 flex gap-2">
            <span className="h-2 w-2 animate-bounce rounded-full bg-brand-600" />

            <span
              className="h-2 w-2 animate-bounce rounded-full bg-brand-600"
              style={{ animationDelay: "0.15s" }}
            />

            <span
              className="h-2 w-2 animate-bounce rounded-full bg-brand-600"
              style={{ animationDelay: "0.3s" }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}