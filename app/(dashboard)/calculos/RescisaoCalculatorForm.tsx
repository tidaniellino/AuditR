"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { calcularRescisao, type RescisaoInput, type ResultadoRescisao, type TipoRescisao, type TipoAvisoPrevio } from "@/lib/calculos/rescisao";
import { buildWhatsAppLink } from "@/lib/calculos/whatsapp-link";
import { formatBRL } from "@/lib/utils";

const WHATSAPP_NUMERO = "5531990676772";

const TIPO_LABELS: Record<TipoRescisao, string> = {
  sem_justa_causa: "Dispensa sem justa causa",
  pedido_demissao: "Pedido de demissão",
  justa_causa: "Dispensa por justa causa",
  acordo_484a: "Acordo (Art. 484-A CLT)",
};

const AVISO_LABELS: Record<TipoAvisoPrevio, string> = {
  indenizado: "Indenizado",
  trabalhado: "Trabalhado",
  dispensado: "Dispensado",
};

function parseMoeda(raw: string): number {
  const n = Number(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function buildMensagemAjuda(input: RescisaoInput | null, resultado: ResultadoRescisao | null): string {
  if (!input || !resultado) {
    return "Olá! Preciso de ajuda com um cálculo trabalhista no AuditR.";
  }
  return (
    `Olá! Fiz uma estimativa de rescisão no AuditR e quero confirmar com um contador.\n` +
    `Tipo: ${TIPO_LABELS[input.tipo]}\n` +
    `Admissão: ${input.dataAdmissao} · Demissão: ${input.dataDemissao}\n` +
    `Salário: ${formatBRL(input.salarioBruto)}\n` +
    `Total líquido estimado: ${formatBRL(resultado.totalLiquido)}`
  );
}

export function RescisaoCalculatorForm() {
  const [tipo, setTipo] = useState<TipoRescisao>("sem_justa_causa");
  const [dataAdmissao, setDataAdmissao] = useState("");
  const [dataDemissao, setDataDemissao] = useState("");
  const [salarioBruto, setSalarioBruto] = useState("");
  const [avisoPrevio, setAvisoPrevio] = useState<TipoAvisoPrevio>("indenizado");
  const [periodosFeriasVencidas, setPeriodosFeriasVencidas] = useState("0");
  const [numeroDependentes, setNumeroDependentes] = useState("0");
  const [saldoFgts, setSaldoFgts] = useState("");

  const [input, setInput] = useState<RescisaoInput | null>(null);
  const [resultado, setResultado] = useState<ResultadoRescisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const emJustaCausa = tipo === "justa_causa";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!dataAdmissao || !dataDemissao) {
      setErro("Informe a data de admissão e de demissão.");
      return;
    }
    if (dataDemissao < dataAdmissao) {
      setErro("A data de demissão não pode ser antes da data de admissão.");
      return;
    }
    const salario = parseMoeda(salarioBruto);
    if (salario <= 0) {
      setErro("Informe o último salário bruto.");
      return;
    }

    const novoInput: RescisaoInput = {
      tipo,
      dataAdmissao,
      dataDemissao,
      salarioBruto: salario,
      avisoPrevio: emJustaCausa ? "dispensado" : avisoPrevio,
      periodosFeriasVencidas: Number(periodosFeriasVencidas) || 0,
      numeroDependentes: Number(numeroDependentes) || 0,
      saldoFgtsInformado: saldoFgts ? parseMoeda(saldoFgts) : undefined,
    };

    setInput(novoInput);
    setResultado(calcularRescisao(novoInput));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Tipo de rescisão" htmlFor="tipo">
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoRescisao)}
            className={`${inputClass} min-h-[44px]`}
          >
            {Object.entries(TIPO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Data de admissão" htmlFor="dataAdmissao">
            <input
              id="dataAdmissao"
              type="date"
              required
              value={dataAdmissao}
              onChange={(e) => setDataAdmissao(e.target.value)}
              className={`${inputClass} min-h-[44px]`}
            />
          </Field>
          <Field label="Data de demissão" htmlFor="dataDemissao">
            <input
              id="dataDemissao"
              type="date"
              required
              value={dataDemissao}
              onChange={(e) => setDataDemissao(e.target.value)}
              className={`${inputClass} min-h-[44px]`}
            />
          </Field>
        </div>

        <Field label="Último salário bruto" htmlFor="salarioBruto" hint="Em reais, ex.: 3.000,00">
          <input
            id="salarioBruto"
            inputMode="decimal"
            placeholder="0,00"
            required
            value={salarioBruto}
            onChange={(e) => setSalarioBruto(e.target.value)}
            className={`${inputClass} min-h-[44px]`}
          />
        </Field>

        {!emJustaCausa && (
          <Field label="Aviso prévio" htmlFor="avisoPrevio">
            <select
              id="avisoPrevio"
              value={avisoPrevio}
              onChange={(e) => setAvisoPrevio(e.target.value as TipoAvisoPrevio)}
              className={`${inputClass} min-h-[44px]`}
            >
              {Object.entries(AVISO_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Férias vencidas" htmlFor="periodosFeriasVencidas" hint="Períodos não gozados">
            <select
              id="periodosFeriasVencidas"
              value={periodosFeriasVencidas}
              onChange={(e) => setPeriodosFeriasVencidas(e.target.value)}
              className={`${inputClass} min-h-[44px]`}
            >
              <option value="0">Nenhum</option>
              <option value="1">1 período</option>
              <option value="2">2 períodos</option>
            </select>
          </Field>
          <Field label="Dependentes (IRRF)" htmlFor="numeroDependentes">
            <input
              id="numeroDependentes"
              type="number"
              min={0}
              value={numeroDependentes}
              onChange={(e) => setNumeroDependentes(e.target.value)}
              className={`${inputClass} min-h-[44px]`}
            />
          </Field>
        </div>

        <Field
          label="Saldo de FGTS (opcional)"
          htmlFor="saldoFgts"
          hint="Do extrato — sem isso, a multa usa uma estimativa"
        >
          <input
            id="saldoFgts"
            inputMode="decimal"
            placeholder="0,00"
            value={saldoFgts}
            onChange={(e) => setSaldoFgts(e.target.value)}
            className={`${inputClass} min-h-[44px]`}
          />
        </Field>

        {erro && <p className="text-sm text-stamp-dim">{erro}</p>}

        <SubmitButton pendingLabel="Calculando..." className="mt-1 min-h-[44px] self-start">
          Calcular
        </SubmitButton>
      </form>

      <div className="flex flex-col gap-4">
        {resultado ? (
          <div className="rounded-card border border-edge bg-card">
            <div className="border-b border-edge bg-mist px-5 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Resultado estimado</p>
            </div>
            <ul className="flex flex-col divide-y divide-edge px-5">
              {resultado.verbas.map((v) => (
                <li key={v.label} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="text-ink_text">{v.label}</span>
                  <span className="font-mono text-ink_text">{formatBRL(v.valor)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-4 py-3 text-sm text-muted">
                <span>(−) INSS</span>
                <span className="font-mono">− {formatBRL(resultado.inss)}</span>
              </li>
              <li className="flex items-center justify-between gap-4 py-3 text-sm text-muted">
                <span>(−) IRRF</span>
                <span className="font-mono">− {formatBRL(resultado.irrf)}</span>
              </li>
            </ul>
            <div className="flex items-center justify-between gap-4 border-t border-edge bg-seal-tint px-5 py-4">
              <span className="font-display text-base text-ink_text">Total líquido estimado</span>
              <span className="font-display text-xl text-seal">{formatBRL(resultado.totalLiquido)}</span>
            </div>
            <div className="border-t border-edge px-5 py-3 text-xs text-muted">
              FGTS depositado no período: {formatBRL(resultado.fgtsDepositoPeriodo)} (vai pra conta vinculada,
              não soma no líquido recebido agora).
            </div>
            {resultado.avisos.length > 0 && (
              <ul className="flex flex-col gap-1.5 border-t border-edge px-5 py-3 text-xs text-muted">
                {resultado.avisos.map((a) => (
                  <li key={a}>· {a}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-card border border-dashed border-edge bg-mist px-6 py-10 text-center">
            <p className="text-sm text-muted">Preencha os dados e clique em "Calcular" para ver a estimativa.</p>
          </div>
        )}

        <a
          href={buildWhatsAppLink(WHATSAPP_NUMERO, buildMensagemAjuda(input, resultado))}
          target="_blank"
          rel="noopener"
          className="btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-card px-4 py-2.5 text-sm font-medium"
        >
          Pedir ajuda a um contador
        </a>
      </div>
    </div>
  );
}
