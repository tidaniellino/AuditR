import { onlyDigits } from "@/lib/validation/cpf-cnpj";

export interface CepLookupResult {
  logradouro: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  uf: string;
}

// Consulta pública de CEP via ViaCEP (sem necessidade de API key).
export async function fetchCepData(cepRaw: string): Promise<CepLookupResult> {
  const cep = onlyDigits(cepRaw);
  if (cep.length !== 8) throw new Error("CEP inválido.");

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error("Falha ao consultar o CEP. Tente novamente em instantes.");
  }

  const data = await res.json();
  if (data.erro) {
    throw new Error("CEP não encontrado.");
  }

  return {
    logradouro: data.logradouro ?? "",
    complemento: data.complemento || null,
    bairro: data.bairro ?? "",
    municipio: data.localidade ?? "",
    uf: data.uf ?? "",
  };
}
