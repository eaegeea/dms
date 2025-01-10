# Dog Management System

A web application to track and manage daily walks and meals for dogs. Built with React, TypeScript, Chakra UI, and Supabase.

## Features

- Track daily walks with pee and poop records
- Manage meal schedules (for specific dogs)
- Real-time notifications for overdue walks and meals
- Analytics dashboard with historical data
- Timezone-aware scheduling
- Mobile-responsive design

## Tech Stack

- React
- TypeScript
- Vite
- Chakra UI
- Supabase
- date-fns
- Recharts

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/eaegeea/dms.git
cd dms
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

## Database Schema

### Walks Table
```sql
create table walks (
  id bigint generated always as identity primary key,
  date date not null,
  time text not null,
  peed boolean default false,
  pooped boolean default false,
  dog_id bigint not null
);
```

### Meals Table
```sql
create table meals (
  id bigint generated always as identity primary key,
  date date not null,
  time text not null,
  completed boolean default false,
  dog_id bigint not null
);
```

## Deployment

The application is deployed on Vercel and uses Supabase for the backend. Environment variables need to be set in the Vercel project settings.
