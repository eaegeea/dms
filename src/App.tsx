import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Add logging for environment variables
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
console.log('Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set');

interface Dog {
  id: number;
  name: string;
  image: string;
}

const DOGS: Dog[] = [
  { id: 1, name: 'Rudolph', image: '/rudolph.jpg' },
  { id: 2, name: 'Ricky', image: '/ricky.jpg' },
];

const App = () => {
  const [selectedDog, setSelectedDog] = useState(DOGS[0]);

  return (
    <ChakraProvider>
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                supabase={supabase} 
                selectedDog={selectedDog}
                onDogChange={setSelectedDog}
                dogs={DOGS}
              />
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <Analytics 
                supabase={supabase} 
                selectedDog={selectedDog}
              />
            } 
          />
        </Routes>
      </Router>
    </ChakraProvider>
  );
};

export default App; 