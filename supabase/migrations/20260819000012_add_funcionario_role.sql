-- Novo papel "Funcionário": acesso a tudo, exceto dados da empresa e sócios
-- (que ficam restritos a Sócio). Em migration isolada porque ALTER TYPE ...
-- ADD VALUE não pode ser usado na mesma transação em que o valor é referenciado.
alter type public.user_role add value 'funcionario';
