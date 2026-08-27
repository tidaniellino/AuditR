-- Valor acordado do contrato (preenchido ao gerar o contrato pela tela de
-- Clientes ou pela tela de Novo Contrato). Usado no merge do .docx como
-- {contrato_valor} e exibido na listagem. Nullable: contratos existentes e o
-- fluxo antigo de /contratos/novo não exigem esse campo.
alter table public.contracts
  add column valor numeric(14,2);
