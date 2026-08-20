-- Clientes podem ser marcados como ativos/inativos (grid de clientes).
alter table public.clients
  add column active boolean not null default true;

-- Impede duas contas com o mesmo CPF/CNPJ (a "organização" agora é 1:1 com
-- o profissional que se cadastra — o campo cnpj passou a guardar CPF ou CNPJ).
alter table public.organizations
  add constraint organizations_cnpj_key unique (cnpj);
