# Dog Management System

A web application to track your dog's daily activities including walks and meals.

## Features

- Track 4 daily walks with pee/poop status
- Track 3 daily meals
- Automatic reset at midnight
- Data persistence with Supabase

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a Supabase project at https://supabase.com

3. Create the following tables in your Supabase database:

```sql
-- Walks table
create table walks (
  id bigint primary key,
  date date not null,
  time text not null,
  peed boolean default false,
  pooped boolean default false
);

-- Meals table
create table meals (
  id bigint primary key,
  date date not null,
  time text not null,
  completed boolean default false
);
```

4. Copy your Supabase URL and anon key from your project settings

5. Create a `.env` file in the root directory with the following content:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

6. Start the development server:
```bash
npm run dev
```

## Technologies Used

- React
- TypeScript
- Vite
- Chakra UI
- Supabase
- date-fns 