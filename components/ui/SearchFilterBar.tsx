"use client";

import { useRef } from "react";
import Link from "next/link";
import { inputClass } from "./Field";

export function SearchFilterBar({
  basePath,
  searchPlaceholder,
  searchParamName = "q",
  currentQuery,
  filterParamName,
  filterLabel,
  filterOptions,
  currentFilter,
}: {
  basePath: string;
  searchPlaceholder: string;
  searchParamName?: string;
  currentQuery?: string;
  filterParamName?: string;
  filterLabel?: string;
  filterOptions?: { value: string; label: string }[];
  currentFilter?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasActiveFilters = Boolean(currentQuery || currentFilter);

  return (
    <form ref={formRef} action={basePath} method="GET" className="mb-6 flex flex-wrap items-center gap-3">
      <input
        type="search"
        name={searchParamName}
        defaultValue={currentQuery ?? ""}
        placeholder={searchPlaceholder}
        className={`${inputClass} w-full max-w-xs`}
      />

      {filterOptions && filterParamName && (
        <select
          name={filterParamName}
          defaultValue={currentFilter ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className={`${inputClass} max-w-[220px]`}
        >
          <option value="">{filterLabel ?? "Todos"}</option>
          {filterOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      <button
        type="submit"
        className="rounded-card border border-edge bg-card px-4 py-2.5 text-sm font-medium text-ink_text transition-colors hover:bg-mist"
      >
        Buscar
      </button>

      {hasActiveFilters && (
        <Link href={basePath} className="text-xs text-muted hover:underline">
          Limpar filtros
        </Link>
      )}
    </form>
  );
}
