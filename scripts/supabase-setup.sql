-- Supabase schema setup for AeroTrack Pro
-- Run this in your Supabase project's SQL Editor (https://app.supabase.com/project/_/sql)

-- Enable UUID extension (if not already enabled)
extension if not exists "uuid-ossp";

-- Flights table (persistent storage for weeks/months)
create table if not exists flights (
  id bigint generated always as identity primary key,
  tracking_id text not null unique,
  flight_number text not null,
  aircraft text not null default 'Boeing 747-8F',
  origin_code text not null,
  destination_code text not null,
  waypoints_json text not null default '[]',
  cruise_kmh integer not null default 880,
  departure_at timestamptz not null,
  status text not null default 'scheduled',
  is_live boolean not null default false,
  cargo_json text not null,
  shipper_json text not null,
  consignee_json text not null,
  notes text,
  emergency_json text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contact messages table
create table if not exists contact_messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  company text,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS) but allow all operations for service key
alter table flights enable row level security;
alter table contact_messages enable row level security;

-- Create policy to allow all operations (service role bypasses RLS anyway)
create policy "Allow all" on flights
  for all using (true) with check (true);

create policy "Allow all" on contact_messages
  for all using (true) with check (true);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists update_flights_updated_at
  before update on flights
  for each row
  execute function update_updated_at_column();

-- Indexes for performance
create index if not exists idx_flights_tracking_id on flights(tracking_id);
create index if not exists idx_flights_status on flights(status);
create index if not exists idx_flights_created_at on flights(created_at desc);

-- Verify setup
select 'Flights table ready' as status, count(*) as existing_flights from flights;
