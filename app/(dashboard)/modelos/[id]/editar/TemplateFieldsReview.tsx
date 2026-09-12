"use client";

import { useState, useTransition } from "react";
import {
  reanalyzeTemplateFields,
  saveTemplateFieldClassification,
  type FieldClassificationInput,
} from "../../actions";
import {
  PARTY_ATTRIBUTE_LABELS,
  CONTRACT_ATTRIBUTE_LABELS,
  type TemplateFieldRole,
} from "@/lib/documents/template-fields";
import { useToast } from "@/components/ui/Toast";

export interface TemplateFieldOccurrenceRow {
  id: string;
  occurrenceIndex: number;
  rawText: string;
  contextSnippet: string;
  role: TemplateFieldRole;
  attributeKey: string | null;
  confidence: "high" | "low";
}

const ROLE_LABELS: Record<TemplateFieldRole, string> = {
  contratante: "Contratante",
  contratada: "Contratada",
  especifico: "Campo específico do contrato",
};

export function TemplateFieldsReview({
  templateId,
  fieldsAnalyzedAt,
  occurrences,
}: {
  templateId: string;
  fieldsAnalyzedAt: string | null;
  occurrences: TemplateFieldOccurrenceRow[];
}) {
  const { push } = useToast();
  const [rows, setRows] = useState(occurrences);
  const [isPending, startTransition] = useTransition();

  function updateRow(id: string, patch: Partial<TemplateFieldOccurrenceRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleRoleChange(id: string, role: TemplateFieldRole) {
    // Muda o papel sempre limpa o atributo — as opções são diferentes por
    // papel (cadastro da parte vs. valor/data/CRC), então um atributo
    // escolhido antes não faz mais sentido depois da troca.
    updateRow(id, { role, attributeKey: null });
  }

  function handleSave() {
    startTransition(async () => {
      const payload: FieldClassificationInput[] = rows.map((r) => ({
        id: r.id,
        role: r.role,
        attributeKey: r.attributeKey,
      }));
      const result = await saveTemplateFieldClassification(templateId, payload);
      push(result.error ? "error" : "success", result.error ?? result.success ?? "Salvo.");
    });
  }

  function handleReanalyze() {
    startTransition(async () => {
      const result = await reanalyzeTemplateFields(templateId);
      if (result.error) {
        push("error", result.error);
        return;
      }
      push("success", result.success ?? "Reanalisado.");
      // A reanálise substitui as linhas no banco — recarrega a página pra
      // trazer o novo conjunto de ocorrências (mais simples que reconciliar
      // client-side um conjunto de IDs que pode ter mudado por completo).
      window.location.reload();
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-card border border-edge bg-card p-5 shadow-sm shadow-ink-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink_text">Campos identificados no modelo</h2>
          <p className="mt-1 text-xs text-muted">
            Campos no formato [TEXTO ENTRE COLCHETES], classificados por posição no texto — corrija o que
            precisar antes de salvar.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReanalyze}
          disabled={isPending}
          className="shrink-0 rounded-card border border-edge px-3 py-1.5 text-xs font-medium text-ink_text hover:bg-mist disabled:opacity-50"
        >
          Reanalisar do zero
        </button>
      </div>

      {!fieldsAnalyzedAt && rows.length === 0 ? (
        <div className="rounded-card border border-dashed border-edge px-4 py-6 text-center text-sm text-muted">
          Este modelo ainda não foi analisado.
          <button
            type="button"
            onClick={handleReanalyze}
            disabled={isPending}
            className="ml-1 text-brand-via hover:underline disabled:opacity-50"
          >
            Analisar agora
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-edge px-4 py-6 text-center text-sm text-muted">
          Nenhum campo variável [ENTRE COLCHETES] foi encontrado neste modelo.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-edge">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge bg-mist text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">Campo</th>
                  <th className="px-3 py-2 font-medium">Trecho no modelo</th>
                  <th className="px-3 py-2 font-medium">Papel</th>
                  <th className="px-3 py-2 font-medium">Atributo do cadastro</th>
                  <th className="px-3 py-2 font-medium">Confiança</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-edge last:border-0 align-top">
                    <td className="px-3 py-2 font-mono text-xs text-ink_text">[{row.rawText}]</td>
                    <td className="max-w-xs px-3 py-2 text-xs text-muted">{row.contextSnippet}</td>
                    <td className="px-3 py-2">
                      <select
                        value={row.role}
                        onChange={(e) => handleRoleChange(row.id, e.target.value as TemplateFieldRole)}
                        className="rounded-card border border-edge bg-mist px-2 py-1.5 text-xs text-ink_text focus:border-brand-via focus:outline-none"
                      >
                        {(Object.keys(ROLE_LABELS) as TemplateFieldRole[]).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.attributeKey ?? ""}
                        onChange={(e) => updateRow(row.id, { attributeKey: e.target.value || null })}
                        className="rounded-card border border-edge bg-mist px-2 py-1.5 text-xs text-ink_text focus:border-brand-via focus:outline-none"
                      >
                        <option value="">
                          {row.role === "especifico" ? "— Nenhum (preenchimento manual) —" : "— Não mapeado —"}
                        </option>
                        {Object.entries(row.role === "especifico" ? CONTRACT_ATTRIBUTE_LABELS : PARTY_ATTRIBUTE_LABELS).map(
                          ([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                          row.confidence === "low"
                            ? "border-stamp/30 text-stamp-dim"
                            : "border-seal/30 text-seal"
                        }`}
                      >
                        {row.confidence === "low" ? "Revisar" : "Alta"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="self-start rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-via/25 transition-all hover:-translate-y-0.5 hover:bg-brand-from hover:shadow-lg hover:shadow-brand-via/35 disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar classificação"}
          </button>
        </>
      )}
    </section>
  );
}
