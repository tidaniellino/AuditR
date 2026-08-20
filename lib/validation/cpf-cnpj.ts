export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factor - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calcDigit(cpf.slice(0, 9), 10);
  const d2 = calcDigit(cpf.slice(0, 10), 11);
  return d1 === parseInt(cpf[9], 10) && d2 === parseInt(cpf[10], 10);
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string) => {
    const weights =
      base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcDigit(cnpj.slice(0, 12));
  const d2 = calcDigit(cnpj.slice(0, 12) + d1);
  return d1 === parseInt(cnpj[12], 10) && d2 === parseInt(cnpj[13], 10);
}

export function isValidCpfCnpj(value: string, tipo: "PF" | "PJ"): boolean {
  return tipo === "PF" ? isValidCPF(value) : isValidCNPJ(value);
}

export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatCNPJ(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatCpfCnpj(value: string, tipo: "PF" | "PJ"): string {
  return tipo === "PF" ? formatCPF(value) : formatCNPJ(value);
}

// Usado onde a pessoa pode ser PF ou PJ e o tipo é inferido pela quantidade de
// dígitos (11 = CPF, 14 = CNPJ) — ex.: cadastro de conta, sem seletor de tipo.
export function isValidCpfOuCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

export function formatCpfOuCnpj(value: string): string {
  const digits = onlyDigits(value);
  return digits.length > 11 ? formatCNPJ(digits) : formatCPF(digits);
}
