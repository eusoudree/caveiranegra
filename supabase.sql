-- Rode esta parte no Supabase.
-- A função de WhatsApp ainda não grava o número porque a tabela original
-- que você me passou não possui essa coluna. Adicione-a:

alter table public.bookings
add column if not exists client_whatsapp text;

-- Se você já executou a função create_booking anterior, substitua por esta versão:

create or replace function public.create_booking(
    p_client_name text,
    p_client_email text,
    p_booking_date date,
    p_start_time time,
    p_end_time time,
    p_amount numeric,
    p_client_whatsapp text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
    v_booking public.bookings;
begin
    update public.bookings
    set status = 'expired',
        updated_at = now()
    where status = 'pending'
      and expires_at is not null
      and expires_at < now();

    if exists (
        select 1
        from public.bookings b
        where b.booking_date = p_booking_date
          and b.status in ('pending','paid','confirmed')
          and (b.expires_at is null or b.expires_at > now())
          and b.start_time < p_end_time
          and b.end_time > p_start_time
    ) then
        raise exception 'HORARIO_INDISPONIVEL';
    end if;

    insert into public.bookings (
        client_name,
        client_email,
        client_whatsapp,
        booking_date,
        start_time,
        end_time,
        amount,
        status,
        booking_token,
        expires_at,
        created_at,
        updated_at
    )
    values (
        trim(p_client_name),
        lower(trim(p_client_email)),
        trim(p_client_whatsapp),
        p_booking_date,
        p_start_time,
        p_end_time,
        p_amount,
        'pending',
        gen_random_uuid(),
        now() + interval '30 minutes',
        now(),
        now()
    )
    returning * into v_booking;

    return v_booking;
end;
$$;

grant execute on function public.create_booking(
    text,text,date,time,time,numeric,text
) to anon, authenticated;

-- Consulta pública controlada dos horários ocupados:
create or replace function public.get_booked_slots(p_date date)
returns table(start_time time, end_time time)
language sql
security definer
set search_path = public
as $$
    select b.start_time, b.end_time
    from public.bookings b
    where b.booking_date = p_date
      and b.status in ('pending','paid','confirmed')
      and (b.expires_at is null or b.expires_at > now())
    order by b.start_time;
$$;

grant execute on function public.get_booked_slots(date)
to anon, authenticated;

-- Não permita SELECT público direto na tabela.
alter table public.bookings enable row level security;
alter table public.services enable row level security;
