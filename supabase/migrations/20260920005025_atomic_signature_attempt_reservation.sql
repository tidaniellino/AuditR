-- CRÍTICO: a Edge Function assinatura fazia SELECT attempts -> checa < 5 ->
-- (se errado) UPDATE attempts = attempts + 1, em passos separados. Sob
-- concorrência, várias requisições simultâneas leem o mesmo valor de
-- attempts antes de qualquer UPDATE aplicar, então todas passam no "< 5" e
-- cada uma testa um código diferente — o limite de 5 tentativas só freia
-- tentativas sequenciais, não um brute-force com requisições em paralelo
-- contra o espaço de 1.000.000 de códigos de 6 dígitos.
--
-- Esta função faz a reserva da tentativa e a checagem do limite em UM ÚNICO
-- UPDATE condicional — atômico por natureza (o próprio Postgres serializa
-- UPDATEs concorrentes na mesma linha), então não existe mais janela onde
-- duas requisições "veem" o mesmo contador ao mesmo tempo.
create or replace function public.reserve_signature_attempt(p_signature_code_id uuid, p_max_attempts int)
returns table (allowed boolean, code_hash text, used_at timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_code_hash text;
  v_used_at timestamptz;
  v_expires_at timestamptz;
begin
  update public.signature_codes s
    set attempts = attempts + 1
    where s.id = p_signature_code_id
      and s.attempts < p_max_attempts
    returning s.id, s.code_hash, s.used_at, s.expires_at
    into v_id, v_code_hash, v_used_at, v_expires_at;

  if v_id is not null then
    return query select true, v_code_hash, v_used_at, v_expires_at;
    return;
  end if;

  -- Não incrementou (limite já atingido ou id inexistente) — devolve o
  -- estado atual só pra permitir uma mensagem de erro precisa, sem
  -- conceder mais nenhuma tentativa.
  return query
    select false, s.code_hash, s.used_at, s.expires_at
    from public.signature_codes s
    where s.id = p_signature_code_id;
end;
$$;

revoke execute on function public.reserve_signature_attempt(uuid, int) from public;
grant execute on function public.reserve_signature_attempt(uuid, int) to service_role;
