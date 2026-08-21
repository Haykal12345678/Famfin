import { useEffect } from 'react';

export default function ConfirmModal({
  open,
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin ingin melanjutkan?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  loading = false,
  variant = 'primary',
}) {
  // =========================================================
  // ESCAPE KEY
  // =========================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onCancel?.();
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    open,
    loading,
    onCancel,
  ]);


  // =========================================================
  // BODY SCROLL LOCK
  // =========================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [open]);


  // =========================================================
  // CLOSED
  // =========================================================

  if (!open) {
    return null;
  }


  // =========================================================
  // VARIANT
  // =========================================================

  const isDanger =
    variant === 'danger';


  const iconWrapperClass = isDanger
    ? 'bg-red-50 text-red-600 ring-red-50/70'
    : 'bg-blue-50 text-blue-600 ring-blue-50/70';


  const decorationClass = isDanger
    ? 'bg-red-100/70'
    : 'bg-blue-100/70';


  const confirmButtonClass = isDanger
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-100'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-100';


  const progressClass = isDanger
    ? 'bg-red-500'
    : 'bg-blue-500';


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        bg-slate-950/40
        px-4
        py-6
        backdrop-blur-[3px]
        animate-[fadeIn_0.18s_ease-out]
      "
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !loading
        ) {
          onCancel?.();
        }
      }}
    >

      {/* =====================================================
          MODAL
      ===================================================== */}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        className="
          w-full
          max-w-md
          overflow-hidden
          rounded-[28px]
          border
          border-slate-200
          bg-white
          shadow-2xl
          ring-1
          ring-black/5
          animate-[confirmModalIn_0.25s_cubic-bezier(0.16,1,0.3,1)]
        "
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >

        {/* ===================================================
            HEADER
        =================================================== */}

        <div
          className="
            relative
            overflow-hidden
            border-b
            border-slate-100
            bg-gradient-to-br
            from-slate-50
            to-white
            px-6
            py-6
            sm:px-7
          "
        >

          {/* DECORATION */}

          <div
            className={`
              absolute
              -right-10
              -top-10
              h-32
              w-32
              rounded-full
              blur-3xl
              ${decorationClass}
            `}
          />


          <div
            className="
              relative
              flex
              items-start
              gap-4
            "
          >

            {/* =================================================
                ICON
            ================================================= */}

            <div
              className={`
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                ring-8
                ${iconWrapperClass}
              `}
            >

              {isDanger ? (

                /* DANGER ICON */

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                  aria-hidden="true"
                >

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 17h.01"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="
                      M10.29 3.86
                      L1.82 18
                      a2 2 0 0 0 1.71 3
                      h16.94
                      a2 2 0 0 0 1.71-3
                      L13.71 3.86
                      a2 2 0 0 0-3.42 0z
                    "
                  />

                </svg>

              ) : (

                /* PRIMARY ICON */

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                  aria-hidden="true"
                >

                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 17h.01"
                  />

                </svg>

              )}

            </div>


            {/* =================================================
                TITLE + MESSAGE
            ================================================= */}

            <div className="min-w-0 flex-1">

              <h2
                id="confirm-modal-title"
                className="
                  text-base
                  font-bold
                  text-slate-900
                  sm:text-lg
                "
              >
                {title}
              </h2>


              <p
                id="confirm-modal-message"
                className="
                  mt-1.5
                  text-xs
                  leading-5
                  text-slate-500
                  sm:text-sm
                "
              >
                {message}
              </p>

            </div>


            {/* =================================================
                CLOSE BUTTON
            ================================================= */}

            <button
              type="button"
              onClick={() => {
                if (!loading) {
                  onCancel?.();
                }
              }}
              disabled={loading}
              aria-label="Tutup"
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-white
                text-slate-400
                shadow-sm
                ring-1
                ring-slate-200
                transition
                hover:bg-slate-50
                hover:text-slate-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
                aria-hidden="true"
              >

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 6L6 18"
                />

              </svg>

            </button>

          </div>

        </div>


        {/* =====================================================
            BODY
        ===================================================== */}

        <div
          className="
            px-6
            py-5
            sm:px-7
          "
        >

          <div
            className="
              rounded-2xl
              bg-slate-50
              px-4
              py-3.5
            "
          >

            <div
              className="
                flex
                items-start
                gap-3
              "
            >

              {/* INFO ICON */}

              <div className="mt-0.5 shrink-0">

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 text-slate-400"
                  aria-hidden="true"
                >

                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 11v5"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8h.01"
                  />

                </svg>

              </div>


              {/* INFO TEXT */}

              <p
                className="
                  text-[11px]
                  leading-5
                  text-slate-500
                "
              >
                Pastikan data yang Anda masukkan sudah
                benar sebelum melanjutkan tindakan ini.
              </p>

            </div>

          </div>

        </div>


        {/* =====================================================
            ACTION
        ===================================================== */}

        <div
          className="
            flex
            flex-col-reverse
            gap-2
            border-t
            border-slate-100
            px-6
            py-5
            sm:flex-row
            sm:justify-end
            sm:px-7
          "
        >

          {/* =================================================
              CANCEL
          ================================================= */}

          <button
            type="button"
            onClick={() => {
              if (!loading) {
                onCancel?.();
              }
            }}
            disabled={loading}
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              px-5
              py-3
              text-xs
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
              hover:text-slate-800
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {cancelText}
          </button>


          {/* =================================================
              CONFIRM
          ================================================= */}

          <button
            type="button"
            onClick={() => {
              if (!loading) {
                onConfirm?.();
              }
            }}
            disabled={loading}
            className={`
              inline-flex
              min-w-[140px]
              items-center
              justify-center
              gap-2
              rounded-xl
              px-5
              py-3
              text-xs
              font-bold
              text-white
              shadow-sm
              transition
              focus:ring-4
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-60
              ${confirmButtonClass}
            `}
          >

            {loading ? (

              <>
                {/* SPINNER */}

                <svg
                  className="
                    h-4
                    w-4
                    animate-spin
                  "
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >

                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="opacity-30"
                  />

                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                </svg>


                <span>
                  Memproses...
                </span>
              </>

            ) : (

              confirmText

            )}

          </button>

        </div>


        {/* =====================================================
            LOADING PROGRESS
            LEFT → RIGHT
        ===================================================== */}

        {loading && (

          <div
            className="
              h-1
              w-full
              overflow-hidden
              bg-slate-100
            "
          >

            <div
              className={`
                h-full
                w-1/2
                ${progressClass}
                animate-[confirmProgress_1.2s_ease-in-out_infinite]
              `}
            />

          </div>

        )}

      </div>

    </div>
  );
}