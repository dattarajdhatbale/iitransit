
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isDark: boolean;
}

export function getPageItems(
  currentPage: number,
  totalPages: number
): (number | "ellipsis-left" | "ellipsis-right")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isDark,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageClick = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageItems = getPageItems(currentPage, totalPages);

  const navBtnBase = "h-9 w-9 rounded-lg flex items-center justify-center transition-colors";
  const numBtnBase = "h-9 min-w-[2.25rem] px-2 rounded-lg text-sm font-semibold flex items-center justify-center transition-colors";

  const enabledStyle = isDark
    ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700 border border-slate-700/60"
    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80";

  const disabledStyle = isDark
    ? "bg-slate-800/80 text-slate-200 border border-slate-700/60 opacity-40 cursor-not-allowed"
    : "bg-slate-100 text-slate-700 border border-slate-200/80 opacity-40 cursor-not-allowed";

  const activeStyle = isDark
    ? "bg-[#7C3AED] text-white shadow-sm"
    : "bg-[#aa82bc] text-white shadow-sm";

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1.5 select-none">
      {/* Previous Button */}
      <button
        type="button"
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => handlePageClick(currentPage - 1)}
        className={`${navBtnBase} ${currentPage <= 1 ? disabledStyle : enabledStyle}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Page Numbers & Ellipses */}
      {pageItems.map((item) => {
        if (typeof item === "string") {
          return (
            <span
              key={item}
              className={`h-9 w-7 flex items-center justify-center text-sm ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              …
            </span>
          );
        }

        const isActive = item === currentPage;
        return (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => handlePageClick(item)}
            className={`${numBtnBase} ${isActive ? activeStyle : enabledStyle}`}
          >
            {item}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        type="button"
        aria-label="Next page"
        disabled={currentPage >= totalPages}
        onClick={() => handlePageClick(currentPage + 1)}
        className={`${navBtnBase} ${currentPage >= totalPages ? disabledStyle : enabledStyle}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
