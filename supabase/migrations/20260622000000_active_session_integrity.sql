-- Prevent multiple clients from starting different sessions for one room.
-- Before applying to an existing database, confirm the preflight query returns no rows:
-- select room_id, count(*) from public.game_sessions
-- where status <> 'finished' group by room_id having count(*) > 1;

create unique index if not exists game_sessions_one_active_per_room
  on public.game_sessions (room_id)
  where status <> 'finished';

create index if not exists participants_room_user_idx
  on public.participants (room_id, user_id);

create index if not exists reservations_room_order_idx
  on public.reservations (room_id, "order");
