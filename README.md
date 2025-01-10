<<<<<<< HEAD
# Dog Management System

A web application to track daily walks and meals for dogs. Built with React, Vite, and Supabase.

## Features

- Track multiple dogs' daily activities
- Record walks with pee/poop tracking
- Manage meal schedules
- Real-time notifications for overdue activities
- Mobile responsive design
- Automatic daily reset at midnight
- New York timezone support

## Tech Stack

- React
- TypeScript
- Vite
- Chakra UI
- Supabase
- date-fns

## Setup

1. Clone the repository:
```bash
git clone [your-repository-url]
cd dog-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Create environment files:
Create `.env` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Database Schema

### Walks Table
```sql
CREATE TABLE walks (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date date NOT NULL,
    time text NOT NULL,
    peed boolean DEFAULT false,
    pooped boolean DEFAULT false,
    dog_id text NOT NULL
);
```

### Meals Table
```sql
CREATE TABLE meals (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date date NOT NULL,
    time text NOT NULL,
    completed boolean DEFAULT false,
    dog_id text NOT NULL
); 
=======
# dms
>>>>>>> 07586929496255d70bd2ad542700139d7e040eae
