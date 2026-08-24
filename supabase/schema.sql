-- Supabase PostgreSQL Schema for Veggies Grocery Delivery Platform

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (linked to auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text not null,
    phone text,
    email text,
    avatar_url text,
    role text not null default 'customer' check (role in ('customer', 'admin', 'delivery')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

-- 2. Addresses
create table public.addresses (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    name text not null, -- 'Home', 'Work', 'Other'
    building_name text not null,
    complete_address text not null,
    latitude numeric(10, 8) not null,
    longitude numeric(11, 8) not null,
    is_default boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Addresses
alter table public.addresses enable row level security;

-- 3. Categories
create table public.categories (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    slug text not null unique,
    description text,
    image_url text,
    order_index integer default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Categories
alter table public.categories enable row level security;

-- 4. Products
create table public.products (
    id uuid default gen_random_uuid() primary key,
    category_id uuid references public.categories(id) on delete set null,
    name text not null,
    slug text not null unique,
    description text,
    price numeric(10, 2) not null check (price >= 0),
    original_price numeric(10, 2) not null check (original_price >= 0),
    discount numeric(5, 2) default 0.00 check (discount >= 0 and discount <= 100),
    weight text not null, -- '250g', '1kg', '1 bunch'
    stock integer default 0 not null check (stock >= 0),
    delivery_time text default '10 mins' not null,
    images text[] default '{}'::text[] not null,
    nutrition jsonb default '{}'::jsonb not null,
    origin text,
    shelf_life text,
    benefits text[] default '{}'::text[] not null,
    is_organic boolean default false not null,
    is_seasonal boolean default false not null,
    is_exotic boolean default false not null,
    rating numeric(3, 2) default 5.00 check (rating >= 0 and rating <= 5),
    reviews_count integer default 0 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Products
alter table public.products enable row level security;

-- 5. Cart Items
create table public.cart_items (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete cascade not null,
    quantity integer not null check (quantity > 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(profile_id, product_id)
);

-- Enable RLS for Cart Items
alter table public.cart_items enable row level security;

-- 6. Coupons
create table public.coupons (
    id uuid default gen_random_uuid() primary key,
    code text not null unique,
    discount_type text not null check (discount_type in ('percentage', 'flat')),
    discount_value numeric(10, 2) not null check (discount_value > 0),
    min_order_value numeric(10, 2) default 0.00 not null check (min_order_value >= 0),
    max_discount numeric(10, 2) check (max_discount > 0),
    start_date timestamp with time zone not null,
    end_date timestamp with time zone not null,
    is_active boolean default true not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Coupons
alter table public.coupons enable row level security;

-- 7. Orders
create table public.orders (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete set null not null,
    address_id uuid references public.addresses(id) on delete set null,
    status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
    total_amount numeric(10, 2) not null check (total_amount >= 0),
    discount_amount numeric(10, 2) default 0.00 not null check (discount_amount >= 0),
    delivery_fee numeric(10, 2) default 20.00 not null check (delivery_fee >= 0),
    net_amount numeric(10, 2) not null check (net_amount >= 0),
    payment_method text not null default 'COD' check (payment_method in ('COD', 'online')),
    payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
    coupon_code text,
    delivery_notes text,
    estimated_delivery_time timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Orders
alter table public.orders enable row level security;

-- 8. Order Items
create table public.order_items (
    id uuid default gen_random_uuid() primary key,
    order_id uuid references public.orders(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete set null,
    name text not null,
    price numeric(10, 2) not null check (price >= 0),
    quantity integer not null check (quantity > 0),
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Order Items
alter table public.order_items enable row level security;

-- 9. Notifications
create table public.notifications (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    message text not null,
    type text not null default 'general' check (type in ('order', 'promo', 'general')),
    read boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Notifications
alter table public.notifications enable row level security;

-- 10. Reviews
create table public.reviews (
    id uuid default gen_random_uuid() primary key,
    product_id uuid references public.products(id) on delete cascade not null,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(profile_id, product_id)
);

-- Enable RLS for Reviews
alter table public.reviews enable row level security;

-- 11. Wishlist
create table public.wishlist (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(profile_id, product_id)
);

-- Enable RLS for Wishlist
alter table public.wishlist enable row level security;


-- ========================================================
-- INDEXES FOR PERFORMANCE
-- ========================================================

create index idx_products_category on public.products(category_id);
create index idx_products_slug on public.products(slug);
create index idx_orders_profile on public.orders(profile_id);
create index idx_order_items_order on public.order_items(order_id);
create index idx_cart_items_profile on public.cart_items(profile_id);
create index idx_reviews_product on public.reviews(product_id);
create index idx_addresses_profile on public.addresses(profile_id);


-- ========================================================
-- TRIGGERS & FUNCTIONS
-- ========================================================

-- Automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, email, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Customer'),
    new.raw_user_meta_data->>'phone',
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

-- PROFILES
create policy "Public profiles are viewable by everyone" 
  on public.profiles for select using (true);

create policy "Users can update their own profile" 
  on public.profiles for update using (auth.uid() = id);

-- ADDRESSES
create policy "Users can view their own addresses" 
  on public.addresses for select using (auth.uid() = profile_id);

create policy "Users can insert their own address" 
  on public.addresses for insert with check (auth.uid() = profile_id);

create policy "Users can update/delete their own address" 
  on public.addresses for all using (auth.uid() = profile_id);

-- CATEGORIES
create policy "Categories are viewable by everyone" 
  on public.categories for select using (true);

create policy "Categories can only be modified by admins" 
  on public.categories for all using (
    exists (
      select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- PRODUCTS
create policy "Products are viewable by everyone" 
  on public.products for select using (true);

create policy "Products can only be modified by admins" 
  on public.products for all using (
    exists (
      select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- CART ITEMS
create policy "Users can view their own cart items" 
  on public.cart_items for select using (auth.uid() = profile_id);

create policy "Users can manage their own cart items" 
  on public.cart_items for all using (auth.uid() = profile_id);

-- COUPONS
create policy "Active coupons are viewable by authenticated users" 
  on public.coupons for select using (auth.role() = 'authenticated');

create policy "Coupons can only be modified by admins" 
  on public.coupons for all using (
    exists (
      select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ORDERS
create policy "Users can view their own orders" 
  on public.orders for select using (auth.uid() = profile_id);

create policy "Users can place their own orders" 
  on public.orders for insert with check (auth.uid() = profile_id);

create policy "Users can cancel their own orders"
  on public.orders for update using (auth.uid() = profile_id and status in ('pending', 'placed', 'confirmed', 'preparing'))
  with check (auth.uid() = profile_id and status = 'cancelled');

create policy "Admins can view and manage all orders" 
  on public.orders for all using (
    exists (
      select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ORDER ITEMS
create policy "Users can view their own order items" 
  on public.order_items for select using (
    exists (
      select 1 from public.orders where orders.id = order_items.order_id and orders.profile_id = auth.uid()
    )
  );

create policy "Users can insert order items" 
  on public.order_items for insert with check (
    exists (
      select 1 from public.orders where orders.id = order_items.order_id and orders.profile_id = auth.uid()
    )
  );

-- NOTIFICATIONS
create policy "Users can view and manage their own notifications" 
  on public.notifications for all using (auth.uid() = profile_id);

-- REVIEWS
create policy "Reviews are viewable by everyone" 
  on public.reviews for select using (true);

create policy "Authenticated users can write reviews" 
  on public.reviews for insert with check (auth.uid() = profile_id);

create policy "Users can update/delete their own reviews" 
  on public.reviews for all using (auth.uid() = profile_id);

-- WISHLIST
create policy "Users can manage their own wishlist" 
  on public.wishlist for all using (auth.uid() = profile_id);
