-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (extends Supabase Auth)
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'SHIPPER' check (role in ('SHIPPER','CARRIER','ADMIN')),
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  type text not null default 'INDIVIDUAL' check (type in ('INDIVIDUAL','BUSINESS')),
  verified_at timestamptz,
  stripe_customer_id text,
  avg_rating numeric(3,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Public profiles are visible" on public.users
  for select using (true);

-- ============================================================
-- CARRIER PROFILES
-- ============================================================
create table if not exists public.carrier_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique references public.users(id) on delete cascade,
  bio text,
  response_rate numeric(5,2) default 100,
  completion_rate numeric(5,2) default 100,
  avg_rating numeric(3,2) default 0,
  total_trips int default 0,
  verification_status text default 'PENDING' check (verification_status in ('PENDING','VERIFIED','REJECTED')),
  stripe_account_id text,
  created_at timestamptz default now()
);

alter table public.carrier_profiles enable row level security;
create policy "Anyone can read carrier profiles" on public.carrier_profiles for select using (true);
create policy "Carriers can update own profile" on public.carrier_profiles for update using (auth.uid() = user_id);

-- ============================================================
-- VEHICLES
-- ============================================================
create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  carrier_id uuid references public.carrier_profiles(id) on delete cascade,
  type text not null check (type in ('VAN','LIGHT_TRUCK','TRUCK_3T5','TRUCK_12T')),
  brand text not null,
  model text not null,
  year int not null,
  plate_number text not null,
  max_weight_kg int not null,
  max_volume_m3 numeric(8,2) not null,
  has_refrigeration boolean default false,
  has_tail_lift boolean default false,
  created_at timestamptz default now()
);

alter table public.vehicles enable row level security;
create policy "Anyone can read vehicles" on public.vehicles for select using (true);
create policy "Carriers can manage own vehicles" on public.vehicles for all
  using (carrier_id in (select id from public.carrier_profiles where user_id = auth.uid()));

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id),
  type text not null check (type in ('ID_CARD','DRIVER_LICENSE','INSURANCE','VEHICLE_REGISTRATION','BUSINESS_REG')),
  file_url text not null,
  status text default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','EXPIRED')),
  expiry_date date,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.documents enable row level security;
create policy "Users can manage own documents" on public.documents for all using (user_id = auth.uid());
create policy "Admins can read all documents" on public.documents for select
  using (exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN'));

-- ============================================================
-- SHIPMENT REQUESTS
-- ============================================================
create table if not exists public.shipment_requests (
  id uuid primary key default uuid_generate_v4(),
  shipper_id uuid references public.users(id) on delete cascade,
  origin_address text not null,
  origin_lat numeric(10,7) not null,
  origin_lng numeric(10,7) not null,
  destination_address text not null,
  destination_lat numeric(10,7) not null,
  destination_lng numeric(10,7) not null,
  pickup_date_from date not null,
  pickup_date_to date not null,
  delivery_date_desired date not null,
  weight_kg numeric(10,2) not null,
  volume_m3 numeric(10,3) not null,
  length_cm numeric(8,1),
  width_cm numeric(8,1),
  height_cm numeric(8,1),
  goods_type text not null check (goods_type in ('palette','colis','meuble','vehicule','vrac','autre')),
  description text,
  fragile boolean default false,
  refrigerated boolean default false,
  urgent boolean default false,
  max_price_eur numeric(10,2),
  estimated_price numeric(10,2),
  distance_km numeric(10,2),
  status text default 'PUBLISHED' check (status in ('DRAFT','PUBLISHED','MATCHED','BOOKED','IN_TRANSIT','DELIVERED','CANCELLED')),
  expires_at timestamptz default now() + interval '30 days',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shipment_requests enable row level security;
create policy "Anyone can read published requests" on public.shipment_requests
  for select using (status != 'DRAFT' or shipper_id = auth.uid());
create policy "Shippers can manage own requests" on public.shipment_requests
  for all using (shipper_id = auth.uid());

-- ============================================================
-- CARRIER OFFERS
-- ============================================================
create table if not exists public.carrier_offers (
  id uuid primary key default uuid_generate_v4(),
  carrier_id uuid references public.carrier_profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id),
  origin_address text not null,
  origin_lat numeric(10,7) not null,
  origin_lng numeric(10,7) not null,
  destination_address text not null,
  destination_lat numeric(10,7) not null,
  destination_lng numeric(10,7) not null,
  route_polyline text,
  departure_date date not null,
  arrival_date_estimated date not null,
  available_weight_kg numeric(10,2) not null,
  available_volume_m3 numeric(10,3) not null,
  accepted_goods_types text[] default array['palette','colis','meuble','vrac','autre'],
  detour_max_km int default 50,
  price_per_km_eur numeric(8,3),
  distance_km numeric(10,2),
  status text default 'PUBLISHED' check (status in ('DRAFT','PUBLISHED','PARTIALLY_BOOKED','FULLY_BOOKED','COMPLETED','CANCELLED')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.carrier_offers enable row level security;
create policy "Anyone can read published offers" on public.carrier_offers
  for select using (status != 'DRAFT' or carrier_id in (select id from public.carrier_profiles where user_id = auth.uid()));
create policy "Carriers can manage own offers" on public.carrier_offers
  for all using (carrier_id in (select id from public.carrier_profiles where user_id = auth.uid()));

-- ============================================================
-- BOOKINGS
-- ============================================================
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid references public.shipment_requests(id),
  offer_id uuid references public.carrier_offers(id),
  shipper_id uuid references public.users(id),
  carrier_id uuid references public.carrier_profiles(id),
  agreed_price_eur numeric(10,2) not null,
  platform_fee_eur numeric(10,2) not null,
  carrier_payout_eur numeric(10,2) not null,
  status text default 'PENDING' check (status in (
    'PENDING','CONFIRMED','PAID','IN_TRANSIT',
    'DELIVERED','CANCELLED_FREE','CANCELLED_FEE','IN_DISPUTE','COMPLETED'
  )),
  payment_intent_id text,
  pickup_proof_url text,
  delivery_proof_url text,
  pickup_confirmed_at timestamptz,
  delivery_confirmed_at timestamptz,
  funds_released_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bookings enable row level security;
create policy "Parties can read own bookings" on public.bookings
  for select using (shipper_id = auth.uid() or
    carrier_id in (select id from public.carrier_profiles where user_id = auth.uid()));
create policy "Shippers can create bookings" on public.bookings
  for insert with check (shipper_id = auth.uid());
create policy "Parties can update own bookings" on public.bookings
  for update using (shipper_id = auth.uid() or
    carrier_id in (select id from public.carrier_profiles where user_id = auth.uid()));

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid unique references public.bookings(id),
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.users(id),
  content text not null,
  type text default 'TEXT' check (type in ('TEXT','IMAGE','DOCUMENT','SYSTEM')),
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Booking parties can access conversation" on public.conversations
  for all using (
    booking_id in (
      select id from public.bookings
      where shipper_id = auth.uid()
        or carrier_id in (select id from public.carrier_profiles where user_id = auth.uid())
    )
  );

create policy "Participants can read messages" on public.messages
  for select using (
    conversation_id in (
      select c.id from public.conversations c
      join public.bookings b on b.id = c.booking_id
      where b.shipper_id = auth.uid()
        or b.carrier_id in (select id from public.carrier_profiles where user_id = auth.uid())
    )
  );

create policy "Participants can send messages" on public.messages
  for insert with check (sender_id = auth.uid());

-- ============================================================
-- REVIEWS
-- ============================================================
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id),
  reviewer_id uuid references public.users(id),
  reviewee_id uuid references public.users(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(booking_id, reviewer_id)
);

alter table public.reviews enable row level security;
create policy "Anyone can read reviews" on public.reviews for select using (true);
create policy "Users can write own reviews" on public.reviews for insert with check (reviewer_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users can manage own notifications" on public.notifications
  for all using (user_id = auth.uid());

-- ============================================================
-- INCIDENTS / DISPUTES
-- ============================================================
create table if not exists public.incidents (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references public.bookings(id),
  opened_by uuid references public.users(id),
  type text not null check (type in ('NON_PICKUP','DAMAGE','DELAY','FRAUD','OTHER')),
  description text not null,
  status text default 'OPEN' check (status in ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED')),
  resolution text,
  resolved_by uuid references public.users(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

alter table public.incidents enable row level security;
create policy "Parties and admins can access incidents" on public.incidents
  for all using (
    opened_by = auth.uid()
    or booking_id in (
      select id from public.bookings
      where shipper_id = auth.uid()
        or carrier_id in (select id from public.carrier_profiles where user_id = auth.uid())
    )
    or exists (select 1 from public.users where id = auth.uid() and role = 'ADMIN')
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create user profile after signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, role, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'SHIPPER'),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update avg_rating on users after review insert
create or replace function public.update_user_rating()
returns trigger language plpgsql security definer as $$
begin
  update public.users
  set avg_rating = (select avg(rating) from public.reviews where reviewee_id = new.reviewee_id)
  where id = new.reviewee_id;
  return new;
end;
$$;

create or replace trigger on_review_created
  after insert on public.reviews
  for each row execute procedure public.update_user_rating();

-- Indexes for geo matching
create index if not exists idx_requests_origin on public.shipment_requests (origin_lat, origin_lng);
create index if not exists idx_requests_destination on public.shipment_requests (destination_lat, destination_lng);
create index if not exists idx_requests_status on public.shipment_requests (status);
create index if not exists idx_requests_dates on public.shipment_requests (pickup_date_from, pickup_date_to);
create index if not exists idx_offers_origin on public.carrier_offers (origin_lat, origin_lng);
create index if not exists idx_offers_destination on public.carrier_offers (destination_lat, destination_lng);
create index if not exists idx_offers_status on public.carrier_offers (status);
create index if not exists idx_offers_departure on public.carrier_offers (departure_date);
create index if not exists idx_bookings_shipper on public.bookings (shipper_id);
create index if not exists idx_bookings_carrier on public.bookings (carrier_id);
create index if not exists idx_notifications_user on public.notifications (user_id, read);
