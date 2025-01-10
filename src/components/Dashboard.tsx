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
  Grid,
  GridItem,
  Button,
  Icon,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { format, parse } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { SupabaseClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { FaTint, FaPoop } from 'react-icons/fa';
import { MdRestaurant } from 'react-icons/md';

interface DashboardProps {
  supabase: SupabaseClient;
  selectedDog: Dog;
  onDogChange: (dog: Dog) => void;
  dogs: Dog[];
}

interface Dog {
  id: number;
  name: string;
  image: string;
}

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

const parseTime = (timeStr: string) => {
  return parse(timeStr, 'h:mm a', new Date());
};

const sortByTime = <T extends { time: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const timeA = parseTime(a.time);
    const timeB = parseTime(b.time);
    return timeA.getTime() - timeB.getTime();
  });
};

const Dashboard: React.FC<DashboardProps> = ({ supabase, selectedDog, onDogChange, dogs }) => {
  const [walks, setWalks] = useState<WalkRecord[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [overdueNotifications, setOverdueNotifications] = useState<string[]>([]);
  const toast = useToast();
  const navigate = useNavigate();

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

        setWalks(sortByTime(insertedWalks as WalkRecord[]));
      } else {
        setWalks(sortByTime(walkData as WalkRecord[]));
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

          setMeals(sortByTime(insertedMeals as MealRecord[]));
        } else {
          setMeals(sortByTime(mealData as MealRecord[]));
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

    setOverdueNotifications([...new Set(notifications)]);
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
    <VStack spacing={8} p={4} align="stretch">
      <HStack justify="space-between" align="center">
        <Select
          value={selectedDog.id}
          onChange={(e) => onDogChange(dogs.find(dog => dog.id === Number(e.target.value)) || dogs[0])}
          maxW="200px"
        >
          {dogs.map(dog => (
            <option key={dog.id} value={dog.id}>{dog.name}</option>
          ))}
        </Select>
        <Button colorScheme="blue" onClick={() => navigate('/analytics')}>
          View Analytics
        </Button>
      </HStack>

      <HStack spacing={4} align="start">
        <Image
          src={selectedDog.image}
          alt={selectedDog.name}
          boxSize="150px"
          objectFit="cover"
          borderRadius="md"
          shadow="md"
        />
        <VStack align="start" flex={1}>
          <Heading size="lg">{selectedDog.name}'s Daily Schedule</Heading>
          <Text fontSize="lg" color="gray.600">
            Current time in New York:{' '}
            {formatInTimeZone(currentTime, 'America/New_York', 'h:mm a')}
          </Text>
        </VStack>
      </HStack>

      {overdueNotifications.length > 0 && (
        <Box p={4} bg="red.100" borderRadius="md" shadow="sm">
          {overdueNotifications.map((notification, index) => (
            <Text key={index} color="red.800" fontWeight="medium">{notification}</Text>
          ))}
        </Box>
      )}

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={8}>
        <GridItem>
          <Box bg="white" p={6} borderRadius="lg" shadow="md">
            <Heading size="md" mb={6} color="gray.700">Walks</Heading>
            <VStack spacing={4} align="stretch">
              {walks.map(walk => (
                <HStack key={walk.id} justify="space-between" p={2} borderRadius="md" bg="gray.50">
                  <Text fontWeight="medium" color="gray.700">{walk.time}</Text>
                  <HStack spacing={8}>
                    <VStack spacing={1} align="center">
                      <HStack>
                        <Icon as={FaTint} color={walk.peed ? "blue.500" : "gray.300"} boxSize={5} />
                        <Text fontSize="sm" color="gray.600">Pee</Text>
                      </HStack>
                      <Checkbox
                        isChecked={walk.peed}
                        onChange={(e) => updateWalk(walk.id, 'peed', e.target.checked)}
                        colorScheme="blue"
                        size="lg"
                        borderColor="blue.300"
                      />
                    </VStack>
                    <VStack spacing={1} align="center">
                      <HStack>
                        <Icon as={FaPoop} color={walk.pooped ? "brown.500" : "gray.300"} boxSize={5} />
                        <Text fontSize="sm" color="gray.600">Poop</Text>
                      </HStack>
                      <Checkbox
                        isChecked={walk.pooped}
                        onChange={(e) => updateWalk(walk.id, 'pooped', e.target.checked)}
                        colorScheme="brown"
                        size="lg"
                        borderColor="brown.300"
                      />
                    </VStack>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          </Box>
        </GridItem>

        {selectedDog.id === 2 && (
          <GridItem>
            <Box bg="white" p={6} borderRadius="lg" shadow="md">
              <Heading size="md" mb={6} color="gray.700">Meals</Heading>
              <VStack spacing={4} align="stretch">
                {meals.map(meal => (
                  <HStack key={meal.id} justify="space-between" p={2} borderRadius="md" bg="gray.50">
                    <Text fontWeight="medium" color="gray.700">{meal.time}</Text>
                    <HStack>
                      <Icon as={MdRestaurant} color={meal.completed ? "green.500" : "gray.300"} />
                      <Checkbox
                        isChecked={meal.completed}
                        onChange={(e) => updateMeal(meal.id, e.target.checked)}
                        colorScheme="green"
                        size="lg"
                      />
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </GridItem>
        )}
      </Grid>
    </VStack>
  );
};

export default Dashboard; 