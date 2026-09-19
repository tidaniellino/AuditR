import Link from "next/link";

function pageHref(basePath: string, page: number, extraParams?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extraParams ?? {})) {
    if (value) params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  extraParams,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-4 flex items-center justify-center gap-1.5" aria-label="Paginação">
      <Link
        href={pageHref(basePath, currentPage - 1, extraParams)}
        aria-disabled={currentPage <= 1}
        className={`rounded-card border border-edge px-3 py-1.5 text-sm text-ink_text transition-colors hover:bg-mist ${
          currentPage <= 1 ? "pointer-events-none opacity-40" : ""
        }`}
      >
        Anterior
      </Link>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <Link
          key={page}
          href={pageHref(basePath, page, extraParams)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`rounded-card border px-3 py-1.5 text-sm transition-colors ${
            page === currentPage
              ? "border-primary bg-primary text-white"
              : "border-edge text-ink_text hover:bg-mist"
          }`}
        >
          {page}
        </Link>
      ))}

      <Link
        href={pageHref(basePath, currentPage + 1, extraParams)}
        aria-disabled={currentPage >= totalPages}
        className={`rounded-card border border-edge px-3 py-1.5 text-sm text-ink_text transition-colors hover:bg-mist ${
          currentPage >= totalPages ? "pointer-events-none opacity-40" : ""
        }`}
      >
        Próxima
      </Link>
    </nav>
  );
}
