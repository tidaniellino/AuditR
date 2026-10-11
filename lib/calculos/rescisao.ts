import { calcularINSS, calcularIRRF } from "./tabelas-2026";

export type TipoRescisao = "sem_justa_causa" | "pedido_demissao" | "justa_causa" | "acordo_484a";
export type TipoAvisoPrevio = "indenizado" | "trabalhado" | "dispensado";

export interface RescisaoInput {
  tipo: TipoRescisao;
  dataAdmissao: string;
  dataDemissao: string;
  salarioBruto: number;
  avisoPrevio: TipoAvisoPrevio;
  periodosFeriasVencidas: number;
  numeroDependentes: number;
  /** Saldo da conta de FGTS, se o cliente souber (do extrato). Sem isso, a
   *  base da multa é uma ESTIMATIVA grosseira (8% do salário × meses de
   *  serviço) — avisamos isso na tela, não é o saldo real da conta. */
  saldoFgtsInformado?: number;
}

export interface Verba {
  label: string;
  valor: number;
  tributavel: boolean;
}

export interface ResultadoRescisao {
  verbas: Verba[];
  totalVerbas: number;
  inss: number;
  irrf: number;
  totalLiquido: number;
  diasAvisoPrevio: number;
  fgtsDepositoPeriodo: number;
  fgtsMultaPercentual: number;
  fgtsBaseMulta: number;
  avisos: string[];
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function anosCompletos(inicio: Date, fim: Date): number {
  let anos = fim.getFullYear() - inicio.getFullYear();
  const aniversarioEsteAno = new Date(fim.getFullYear(), inicio.getMonth(), inicio.getDate());
  if (fim < aniversarioEsteAno) anos -= 1;
  return Math.max(0, anos);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Meses completos dentro do período aquisitivo corrente (0-11), contando
 *  fração ≥15 dias como mês completo — regra clássica da CLT pra férias e
 *  13º proporcionais. */
function mesesNoPeriodoCorrente(dataAdmissao: Date, dataReferencia: Date): number {
  const anos = anosCompletos(dataAdmissao, dataReferencia);
  const inicioPeriodo = new Date(dataAdmissao.getFullYear() + anos, dataAdmissao.getMonth(), dataAdmissao.getDate());
  let meses = 0;
  let marcador = new Date(inicioPeriodo);
  while (true) {
    const proximoMes = new Date(marcador.getFullYear(), marcador.getMonth() + 1, marcador.getDate());
    const diasNoMes = (proximoMes.getTime() - marcador.getTime()) / 86_400_000;
    const diasRestantes = (dataReferencia.getTime() - marcador.getTime()) / 86_400_000;
    if (diasRestantes < 15) break;
    meses += 1;
    if (diasRestantes < diasNoMes) break;
    marcador = proximoMes;
    if (meses >= 12) break;
  }
  return Math.min(12, meses);
}

/** Meses completos trabalhados no ANO CALENDÁRIO da referência — base do 13º
 *  proporcional (fração ≥15 dias conta como mês completo). */
function mesesNoAnoCalendario(dataAdmissao: Date, dataReferencia: Date): number {
  const inicioAno = new Date(dataReferencia.getFullYear(), 0, 1);
  const inicioContagem = dataAdmissao > inicioAno ? dataAdmissao : inicioAno;
  let meses = 0;
  for (let mes = inicioContagem.getMonth(); mes <= dataReferencia.getMonth(); mes++) {
    const diaInicio = mes === inicioContagem.getMonth() ? inicioContagem.getDate() : 1;
    const ultimoDiaTrabalhado = mes === dataReferencia.getMonth() ? dataReferencia.getDate() : new Date(dataReferencia.getFullYear(), mes + 1, 0).getDate();
    if (ultimoDiaTrabalhado - diaInicio + 1 >= 15) meses += 1;
  }
  return Math.min(12, meses);
}

export function calcularRescisao(input: RescisaoInput): ResultadoRescisao {
  const avisos: string[] = [];
  const dataAdmissao = parseISO(input.dataAdmissao);
  const dataDemissao = parseISO(input.dataDemissao);
  const salario = input.salarioBruto;

  const anos = anosCompletos(dataAdmissao, dataDemissao);
  // Aviso prévio indenizado é pago pelo EMPREGADOR — só existe quando é ele
  // quem encerra o contrato (dispensa sem justa causa) ou no acordo mútuo
  // (484-A, pago na metade). Em pedido de demissão e justa causa, o
  // empregado não recebe essa verba.
  const temDireitoAReceberAviso = input.tipo === "sem_justa_causa" || input.tipo === "acordo_484a";

  // Lei 12.506/2011: 30 dias + 3 por ano completo de serviço, até 90 no total.
  const diasAvisoPrevio = temDireitoAReceberAviso ? Math.min(90, 30 + 3 * anos) : 0;
  const avisoEhIndenizado = temDireitoAReceberAviso && input.avisoPrevio === "indenizado";
  if (input.tipo === "pedido_demissao" && input.avisoPrevio === "indenizado") {
    avisos.push("Pedido de demissão: o empregado não recebe aviso prévio indenizado do empregador.");
  }

  // Projeção do aviso prévio indenizado conta como tempo de serviço para
  // férias, 13º e FGTS (Súmula 371 TST / OJ 82 SDI-1) — mas não pro próprio
  // cálculo dos dias de aviso, que usa o tempo até a demissão efetiva.
  const dataReferencia = avisoEhIndenizado ? addDays(dataDemissao, diasAvisoPrevio) : dataDemissao;

  const verbas: Verba[] = [];

  // 1) Saldo de salário — dias corridos do mês da rescisão, mês comercial de 30 dias.
  const diasSaldoSalario = dataDemissao.getDate();
  const saldoSalario = Math.round(((salario / 30) * diasSaldoSalario) * 100) / 100;
  verbas.push({ label: "Saldo de salário", valor: saldoSalario, tributavel: true });

  // 2) Aviso prévio indenizado — metade no acordo do Art. 484-A CLT.
  let valorAvisoPrevio = 0;
  if (avisoEhIndenizado) {
    valorAvisoPrevio = Math.round(((salario / 30) * diasAvisoPrevio) * 100) / 100;
    if (input.tipo === "acordo_484a") valorAvisoPrevio = Math.round((valorAvisoPrevio / 2) * 100) / 100;
    verbas.push({ label: "Aviso prévio indenizado", valor: valorAvisoPrevio, tributavel: false });
  } else if (input.avisoPrevio === "trabalhado") {
    avisos.push("Aviso prévio trabalhado: já é pago como salário normal do mês, não soma aqui.");
  }

  // 3) Férias vencidas (já adquiridas, não gozadas) + 1/3 — mantidas mesmo em justa causa.
  if (input.periodosFeriasVencidas > 0) {
    const valorFeriasVencidas = Math.round(salario * input.periodosFeriasVencidas * (4 / 3) * 100) / 100;
    verbas.push({
      label: input.periodosFeriasVencidas === 1 ? "Férias vencidas + 1/3" : `Férias vencidas (${input.periodosFeriasVencidas}x) + 1/3`,
      valor: valorFeriasVencidas,
      tributavel: false,
    });
  }

  // 4) Férias proporcionais + 1/3 — perdidas em dispensa por justa causa (Art. 146, § único CLT).
  if (input.tipo !== "justa_causa") {
    const mesesFerias = mesesNoPeriodoCorrente(dataAdmissao, dataReferencia);
    if (mesesFerias > 0) {
      const valorFeriasProp = Math.round(((salario / 12) * mesesFerias * (4 / 3)) * 100) / 100;
      verbas.push({ label: `Férias proporcionais (${mesesFerias}/12) + 1/3`, valor: valorFeriasProp, tributavel: false });
    }
  } else {
    avisos.push("Dispensa por justa causa: sem férias proporcionais (mantidas só as já vencidas).");
  }

  // 5) 13º salário proporcional — mesma perda em justa causa (entendimento majoritário).
  let decimoTerceiro = 0;
  if (input.tipo !== "justa_causa") {
    const meses13 = mesesNoAnoCalendario(dataAdmissao, dataReferencia);
    if (meses13 > 0) {
      decimoTerceiro = Math.round(((salario / 12) * meses13) * 100) / 100;
      verbas.push({ label: `13º salário proporcional (${meses13}/12)`, valor: decimoTerceiro, tributavel: true });
    }
  } else {
    avisos.push("Dispensa por justa causa: sem 13º proporcional.");
  }

  // 6) FGTS — depósito do período (informativo, vai pra conta vinculada, não
  //    soma no líquido recebido na hora) + multa (essa sim é paga direto).
  const baseFgtsPeriodo = saldoSalario + valorAvisoPrevio + decimoTerceiro;
  const fgtsDepositoPeriodo = Math.round(baseFgtsPeriodo * 0.08 * 100) / 100;

  const multaPercentual = input.tipo === "sem_justa_causa" ? 0.4 : input.tipo === "acordo_484a" ? 0.2 : 0;
  let fgtsBaseMulta = input.saldoFgtsInformado;
  if (fgtsBaseMulta === undefined) {
    const mesesServico = anos * 12 + mesesNoPeriodoCorrente(dataAdmissao, dataDemissao);
    fgtsBaseMulta = Math.round(salario * 0.08 * Math.max(1, mesesServico) * 100) / 100;
    avisos.push("Saldo de FGTS não informado — multa estimada sobre 8% do salário × meses de serviço. Confira o extrato real do FGTS para um valor exato.");
  }
  const multaFgts = Math.round(fgtsBaseMulta * multaPercentual * 100) / 100;
  if (multaFgts > 0) {
    verbas.push({ label: `Multa de ${Math.round(multaPercentual * 100)}% do FGTS`, valor: multaFgts, tributavel: false });
  }

  // 7) Descontos — INSS e IRRF só sobre verbas salariais (saldo de salário e
  //    13º, cada um na sua própria base — o 13º tem tributação exclusiva).
  // calcularIRRF já desconta o INSS internamente da base — passamos o valor
  // bruto da verba, não o líquido (senão o INSS seria descontado 2x).
  const inssSaldo = calcularINSS(saldoSalario);
  const inss13 = calcularINSS(decimoTerceiro);
  const irrfSaldo = calcularIRRF(saldoSalario, input.numeroDependentes);
  const irrf13 = calcularIRRF(decimoTerceiro, input.numeroDependentes);

  const inss = Math.round((inssSaldo + inss13) * 100) / 100;
  const irrf = Math.round((irrfSaldo + irrf13) * 100) / 100;

  const totalVerbas = Math.round(verbas.reduce((acc, v) => acc + v.valor, 0) * 100) / 100;
  const totalLiquido = Math.round((totalVerbas - inss - irrf) * 100) / 100;

  if (input.tipo === "acordo_484a") {
    avisos.push("Acordo Art. 484-A: libera 80% do saldo de FGTS pra sacar, mas isso é saldo que já era do trabalhador — não contabilizado aqui como verba nova.");
  }

  return {
    verbas,
    totalVerbas,
    inss,
    irrf,
    totalLiquido,
    diasAvisoPrevio,
    fgtsDepositoPeriodo,
    fgtsMultaPercentual: multaPercentual,
    fgtsBaseMulta,
    avisos,
  };
}
