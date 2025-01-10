import {
  Box,
  Checkbox,
  Heading,
  HStack,
  Image,
  Select,
  Text,
  useToast,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  ChakraProvider,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { createClient } from '@supabase/supabase-js';
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

interface WalkRecord {
  id: number;
  date: string;
  time: string;
  peed: boolean;
  pooped: boolean;
  dog_id: number;
}

interface MealRecord {
  id: number;
  date: string;
  time: string;
  completed: boolean;
  dog_id: number;
}

interface NewWalkRecord extends Omit<WalkRecord, 'id'> {}
interface NewMealRecord extends Omit<MealRecord, 'id'> {}

const DEFAULT_WALKS: Omit<WalkRecord, 'id' | 'date' | 'dog_id'>[] = [
  { time: '9:00 AM', peed: false, pooped: false },
  { time: '2:00 PM', peed: false, pooped: false },
  { time: '6:00 PM', peed: false, pooped: false },
  { time: '10:00 PM', peed: false, pooped: false },
];

const DEFAULT_MEALS: Omit<MealRecord, 'id' | 'date' | 'dog_id'>[] = [
  { time: '9:00 AM', completed: false },
  { time: '2:00 PM', completed: false },
  { time: '6:00 PM', completed: false },
];

const App = () => {
  const [walks, setWalks] = useState<WalkRecord[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [selectedDog, setSelectedDog] = useState(DOGS[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [overdueNotifications, setOverdueNotifications] = useState<string[]>([]);
  const toast = useToast();

  const showError = (error: unknown) => {
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'An error occurred',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  };

  const loadTodayData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Fetch walks
      const { data: walkData, error: walkError } = await supabase
        .from('walks')
        .select('*')
        .eq('date', today)
        .eq('dog_id', selectedDog.id);

      if (walkError) throw walkError;

      if (!walkData || walkData.length === 0) {
        const newWalks: NewWalkRecord[] = DEFAULT_WALKS.map(walk => ({
          ...walk,
          date: today,
          dog_id: selectedDog.id,
        }));

        const { data: insertedWalks, error: insertError } = await supabase
          .from('walks')
          .insert(newWalks)
          .select();

        if (insertError) throw insertError;

        setWalks(insertedWalks as WalkRecord[]);
      } else {
        setWalks(walkData as WalkRecord[]);
      }

      // Only fetch and create meals for Ricky (dog_id: 2)
      if (selectedDog.id === 2) {
        const { data: mealData, error: mealError } = await supabase
          .from('meals')
          .select('*')
          .eq('date', today)
          .eq('dog_id', selectedDog.id);

        if (mealError) throw mealError;

        if (!mealData || mealData.length === 0) {
          const newMeals: NewMealRecord[] = DEFAULT_MEALS.map(meal => ({
            ...meal,
            date: today,
            dog_id: selectedDog.id,
          }));

          const { data: insertedMeals, error: insertError } = await supabase
            .from('meals')
            .insert(newMeals)
            .select();

          if (insertError) throw insertError;

          setMeals(insertedMeals as MealRecord[]);
        } else {
          setMeals(mealData as MealRecord[]);
        }
      } else {
        setMeals([]);
      }
    } catch (err) {
      console.error('Error details:', err);
      showError(err);
    }
  };

  const updateWalk = async (walkId: number, field: 'peed' | 'pooped', value: boolean) => {
    try {
      const walkToUpdate = walks.find(w => w.id === walkId);
      if (!walkToUpdate) {
        throw new Error('Walk not found');
      }

      const { error } = await supabase
        .from('walks')
        .update({
          [field]: value,
        })
        .eq('id', walkId)
        .eq('dog_id', selectedDog.id);

      if (error) throw error;

      setWalks(walks.map(walk => 
        walk.id === walkId ? { ...walk, [field]: value } : walk
      ));
    } catch (err) {
      showError(err);
    }
  };

  const updateMeal = async (mealId: number, completed: boolean) => {
    try {
      const mealToUpdate = meals.find(m => m.id === mealId);
      if (!mealToUpdate) {
        throw new Error('Meal not found');
      }

      const { error } = await supabase
        .from('meals')
        .update({
          completed: completed,
        })
        .eq('id', mealId)
        .eq('dog_id', selectedDog.id);

      if (error) throw error;

      setMeals(meals.map(meal =>
        meal.id === mealId ? { ...meal, completed } : meal
      ));
    } catch (err) {
      showError(err);
    }
  };

  const checkOverdueItems = () => {
    const notifications: string[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    walks.forEach(walk => {
      const [hour, minute] = walk.time.match(/(\d+):(\d+)/)?.slice(1).map(Number) || [0, 0];
      const isPM = walk.time.includes('PM');
      const walkHour = (hour === 12 ? 0 : hour) + (isPM ? 12 : 0);

      if (
        (currentHour > walkHour || (currentHour === walkHour && currentMinute > minute)) &&
        !walk.peed &&
        currentHour - walkHour >= 1
      ) {
        notifications.push(`${selectedDog.name} is due for a walk`);
      }
    });

    if (selectedDog.id === 2) { // Only check meals for Ricky
      meals.forEach(meal => {
        const [hour, minute] = meal.time.match(/(\d+):(\d+)/)?.slice(1).map(Number) || [0, 0];
        const isPM = meal.time.includes('PM');
        const mealHour = (hour === 12 ? 0 : hour) + (isPM ? 12 : 0);

        if (
          (currentHour > mealHour || (currentHour === mealHour && currentMinute > minute)) &&
          !meal.completed &&
          currentHour - mealHour >= 1
        ) {
          notifications.push(`${selectedDog.name} is due for a meal`);
        }
      });
    }

    setOverdueNotifications(notifications);
  };

  useEffect(() => {
    loadTodayData();
  }, [selectedDog]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      checkOverdueItems();
    }, 1000);

    return () => clearInterval(timer);
  }, [walks, meals]);

  return (
    <ChakraProvider>
      <Box p={4}>
        <VStack spacing={8} align="stretch">
          <HStack spacing={4} align="center">
            <Select
              value={selectedDog.id}
              onChange={(e) => setSelectedDog(DOGS.find(dog => dog.id === parseInt(e.target.value)) || DOGS[0])}
              maxW="200px"
            >
              {DOGS.map(dog => (
                <option key={dog.id} value={dog.id}>{dog.name}</option>
              ))}
            </Select>
            <Image
              src={selectedDog.image}
              alt={selectedDog.name}
              boxSize="100px"
              objectFit="cover"
              borderRadius="full"
            />
            <Text fontSize="sm" color="gray.500">
              Current time in New York: {formatInTimeZone(currentTime, 'America/New_York', 'h:mm a')}
            </Text>
          </HStack>

          {overdueNotifications.length > 0 && (
            <Box bg="red.100" p={4} borderRadius="md">
              {overdueNotifications.map((notification, index) => (
                <Text key={index} color="red.600">{notification}</Text>
              ))}
            </Box>
          )}

          <Box>
            <Heading size="lg" mb={4}>Today's Walks</Heading>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Time</Th>
                  <Th>Peed</Th>
                  <Th>Pooped</Th>
                </Tr>
              </Thead>
              <Tbody>
                {walks.map(walk => (
                  <Tr key={walk.id}>
                    <Td>{walk.time}</Td>
                    <Td>
                      <Checkbox
                        isChecked={walk.peed}
                        onChange={(e) => updateWalk(walk.id, 'peed', e.target.checked)}
                        colorScheme="green"
                      />
                    </Td>
                    <Td>
                      <Checkbox
                        isChecked={walk.pooped}
                        onChange={(e) => updateWalk(walk.id, 'pooped', e.target.checked)}
                        colorScheme="green"
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {selectedDog.id === 2 && (
            <Box>
              <Heading size="lg" mb={4}>Today's Meals</Heading>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Completed</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {meals.map(meal => (
                    <Tr key={meal.id}>
                      <Td>{meal.time}</Td>
                      <Td>
                        <Checkbox
                          isChecked={meal.completed}
                          onChange={(e) => updateMeal(meal.id, e.target.checked)}
                          colorScheme="green"
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}

          <Analytics supabase={supabase} selectedDog={selectedDog} />
        </VStack>
      </Box>
    </ChakraProvider>
  );
};

export default App; 