-- Per-user rate limiting for expensive (AI) operations.
-- Counters live in Postgres so limits hold across serverless instances.

create table public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (user_id, bucket)
);

-- No policies: the table is only reachable through the function below.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

/*
 * Counts one request in the caller's bucket and reports whether it is allowed.
 * The user is taken from the verified session, never from an argument, and the
 * insert/update is atomic, so parallel requests can't overshoot the limit.
 */
-- Parameters are prefixed to keep them distinct from the columns of the same name.
create or replace function public.consume_rate_limit(p_bucket text, p_max_requests integer, p_window_seconds integer)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  now_ts timestamptz := now();
  current_count integer;
  current_start timestamptz;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_max_requests < 1 or p_window_seconds < 1 then
    raise exception 'invalid limit' using errcode = '22023';
  end if;

  insert into public.rate_limits as r (user_id, bucket, window_start, count)
  values (uid, p_bucket, now_ts, 1)
  on conflict (user_id, bucket) do update
    set count = case
          when r.window_start < now_ts - make_interval(secs => p_window_seconds) then 1
          else r.count + 1
        end,
        window_start = case
          when r.window_start < now_ts - make_interval(secs => p_window_seconds) then now_ts
          else r.window_start
        end
  returning r.count, r.window_start into current_count, current_start;

  return query
    select
      current_count <= p_max_requests,
      greatest(
        1,
        ceil(extract(epoch from (current_start + make_interval(secs => p_window_seconds)) - now_ts))::integer
      );
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

-- Lets a cleanup job (or a future cron) drop windows that are long expired.
create index rate_limits_window_idx on public.rate_limits (window_start);
