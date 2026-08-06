export default function Pagination({
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  className = "",
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const generatePages = () => {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) pages.push("...");

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) pages.push("...");

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between ${className}`}
    >
      {/* Info */}
      <div>
        <p className="text-sm font-medium text-slate-700">
          Menampilkan{" "}
          <span className="font-bold">
            {from}-{to}
          </span>{" "}
          dari{" "}
          <span className="font-bold">
            {total}
          </span>{" "}
          data
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Halaman {page} dari {totalPages}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap items-center gap-2">

        {/* First */}
        <button
          disabled={page === 1}
          onClick={() => onPageChange(1)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          «
        </button>

        {/* Prev */}
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>

        {/* Number */}
        {generatePages().map((item, index) =>
          item === "..." ? (
            <span
              key={index}
              className="px-2 text-slate-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={`h-10 min-w-[42px] rounded-xl border text-sm font-semibold transition-all duration-200
                ${
                  page === item
                    ? "border-brand-600 bg-brand-600 text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
            >
              {item}
            </button>
          )
        )}

        {/* Next */}
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>

        {/* Last */}
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(totalPages)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          »
        </button>

      </div>
    </div>
  );
}