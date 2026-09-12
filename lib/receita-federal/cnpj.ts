import { onlyDigits } from "@/lib/validation/cpf-cnpj";

export interface CnpjEndereco {
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

export interface CnpjLookupResult {
  razaoSocial: string;
  nomeFantasia: string | null;
  email: string | null;
  telefone: string | null;
  situacaoCadastral: string;
  cnaePrincipal: string | null;
  endereco: CnpjEndereco;
  raw: unknown;
}

// Consulta pública à Receita Federal via BrasilAPI (sem necessidade de API key).
// Se a organização tiver contrato com um provedor oficial (ex.: Serpro), trocar
// a implementação aqui e usar RECEITA_FEDERAL_API_KEY — o restante do app não
// precisa mudar, pois só depende do formato de CnpjLookupResult.
export async function fetchCnpjData(cnpjRaw: string): Promise<CnpjLookupResult> {
  const cnpj = onlyDigits(cnpjRaw);

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    cache: "no-store",
    // A BrasilAPI bloqueia (403) requisições sem User-Agent — o fetch nativo do
    // Node não envia um por padrão, diferente de navegadores/curl.
    headers: {
      "User-Agent": "AuditR-Contratos/1.0",
      Accept: "application/json",
    },
  });

  if (res.status === 404) {
    throw new Error("CNPJ não encontrado na Receita Federal.");
  }
  if (res.status === 429) {
    throw new Error("Muitas consultas em sequência. Aguarde alguns segundos e tente novamente.");
  }
  if (!res.ok) {
    throw new Error("Falha ao consultar a Receita Federal. Tente novamente em instantes.");
  }

  const data = await res.json();

  return {
    razaoSocial: data.razao_social ?? "",
    nomeFantasia: data.nome_fantasia || null,
    email: data.email || null,
    telefone: data.ddd_telefone_1 || null,
    situacaoCadastral: data.descricao_situacao_cadastral ?? "",
    cnaePrincipal: data.cnae_fiscal_descricao || null,
    endereco: {
      logradouro: data.logradouro ?? "",
      numero: data.numero ?? "",
      complemento: data.complemento || null,
      bairro: data.bairro ?? "",
      municipio: data.municipio ?? "",
      uf: data.uf ?? "",
      cep: data.cep ?? "",
    },
    raw: data,
  };
}
