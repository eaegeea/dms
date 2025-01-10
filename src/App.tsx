import React from 'react';
import { 
  ChakraProvider, 
  Container, 
  VStack, 
  Heading, 
  Box, 
  Checkbox, 
  Text, 
  Grid, 
  useToast, 
  Spinner, 
  Center, 
  Icon, 
  HStack,
  Image,
  Select,
  CheckboxIcon,
  useColorModeValue
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { FaPoop, FaTint, FaDog, FaBone, FaCheck, FaClock } from 'react-icons/fa';
import { MdRestaurant } from 'react-icons/md';

// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface WalkRecord {
  id: number;
  date: string;
  time: string;
  peed: boolean;
  pooped: boolean;
  dog_id: string;
}

interface MealRecord {
  id: number;
  date: string;
  time: string;
  completed: boolean;
  dog_id: string;
}

interface Dog {
  id: string;
  name: string;
  image: string;
}

const DOGS: Dog[] = [
  { id: 'rudolph', name: 'Rudolph', image: '/rudolph.jpg' },
  { id: 'ricky', name: 'Ricky', image: '/ricky.jpg' },
];

const DEFAULT_WALKS = [
  { time: '9:00 AM', peed: false, pooped: false },
  { time: '2:00 PM', peed: false, pooped: false },
  { time: '6:00 PM', peed: false, pooped: false },
  { time: '10:00 PM', peed: false, pooped: false },
];

const DEFAULT_MEALS = [
  { time: '9:00 AM', completed: false },
  { time: '2:00 PM', completed: false },
  { time: '6:00 PM', completed: false },
];

const parseTime = (time: string) => {
  const [hourStr, period] = time.split(' ');
  let [hours, minutes] = hourStr.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const sortByTime = (a: { time: string }, b: { time: string }) => {
  return parseTime(a.time) - parseTime(b.time);
};

const isOverdue = (timeStr: string) => {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date();
  
  let scheduleHours = hours;
  if (period === 'PM' && hours !== 12) scheduleHours += 12;
  if (period === 'AM' && hours === 12) scheduleHours = 0;
  
  scheduledTime.setHours(scheduleHours, minutes, 0, 0);
  
  // Check if more than 1 hour past due
  return now.getTime() - scheduledTime.getTime() > 60 * 60 * 1000;
};

const CustomCheckbox = (props: any) => {
  const { isChecked, ...rest } = props;
  return (
    <Checkbox
      {...rest}
      icon={<Icon as={FaCheck} />}
      sx={{
        'span.chakra-checkbox__control': {
          borderRadius: '50%',
          width: '1.5rem',
          height: '1.5rem',
          transition: 'all 0.2s',
          bg: isChecked ? 'green.500' : 'white',
          color: 'white',
          borderColor: isChecked ? 'green.500' : 'gray.300',
          _hover: {
            borderColor: isChecked ? 'green.600' : 'green.500',
          },
        },
      }}
    />
  );
};

function App() {
  const [walks, setWalks] = useState<WalkRecord[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDog, setSelectedDog] = useState<Dog>(DOGS[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const toast = useToast();
  const [overdueNotifications, setOverdueNotifications] = useState<string[]>([]);

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadTodayData(selectedDog.id);
  }, [selectedDog]);

  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight.getTime() - new Date().getTime();
    
    const timer = setTimeout(() => {
      resetData();
    }, timeUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkOverdueItems = () => {
      const notifications: string[] = [];
      
      // Check walks
      walks.forEach(walk => {
        if (isOverdue(walk.time) && !walk.peed) {
          notifications.push(`${selectedDog.name} is due for a walk (${walk.time})`);
        }
      });

      // Check meals only for Ricky
      if (selectedDog.id === 'ricky') {
        meals.forEach(meal => {
          if (isOverdue(meal.time) && !meal.completed) {
            notifications.push(`${selectedDog.name} is due for a meal (${meal.time})`);
          }
        });
      }

      setOverdueNotifications(notifications);
    };

    // Check immediately and then every minute
    checkOverdueItems();
    const interval = setInterval(checkOverdueItems, 60 * 1000);

    return () => clearInterval(interval);
  }, [walks, meals, selectedDog]);

  const loadTodayData = async (dogId: string) => {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      // Load walks for both dogs
      let { data: walkData, error: walkError } = await supabase
        .from('walks')
        .select('id, date, time, peed, pooped, dog_id')
        .eq('date', today)
        .eq('dog_id', dogId);

      console.log('Loaded walks:', walkData);

      if (walkError) {
        console.error('Error loading walks:', walkError);
        throw walkError;
      }

      if (!walkData || walkData.length === 0) {
        console.log('Creating new walks for today');
        const newWalks = DEFAULT_WALKS.map(walk => ({
          date: today,
          time: walk.time,
          peed: false,
          pooped: false,
          dog_id: dogId
        }));

        const { data: insertedWalks, error: insertError } = await supabase
          .from('walks')
          .insert(newWalks)
          .select();

        if (insertError) {
          console.error('Error inserting walks:', insertError);
          throw insertError;
        }
        console.log('Created new walks:', insertedWalks);
        walkData = insertedWalks;
      }

      setWalks((walkData || []).sort(sortByTime));

      // Only load and create meals for Ricky
      if (dogId === 'ricky') {
        let { data: mealData, error: mealError } = await supabase
          .from('meals')
          .select('id, date, time, completed, dog_id')
          .eq('date', today)
          .eq('dog_id', dogId);

        console.log('Loaded meals:', mealData);

        if (mealError) {
          console.error('Error loading meals:', mealError);
          throw mealError;
        }

        if (!mealData || mealData.length === 0) {
          console.log('Creating new meals for today');
          const newMeals = DEFAULT_MEALS.map(meal => ({
            date: today,
            time: meal.time,
            completed: false,
            dog_id: dogId
          }));

          const { data: insertedMeals, error: insertError } = await supabase
            .from('meals')
            .insert(newMeals)
            .select();

          if (insertError) {
            console.error('Error inserting meals:', insertError);
            throw insertError;
          }
          console.log('Created new meals:', insertedMeals);
          mealData = insertedMeals;
        }

        setMeals((mealData || []).sort(sortByTime));
      } else {
        // Clear meals for Rudolph
        setMeals([]);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      // Set default data if there's an error
      const defaultWalks = DEFAULT_WALKS.map((walk, index) => ({
        id: index + 1,
        date: today,
        time: walk.time,
        peed: false,
        pooped: false,
        dog_id: dogId
      }));

      setWalks(defaultWalks.sort(sortByTime));
      
      if (dogId === 'ricky') {
        const defaultMeals = DEFAULT_MEALS.map((meal, index) => ({
          id: index + 1,
          date: today,
          time: meal.time,
          completed: false,
          dog_id: dogId
        }));
        setMeals(defaultMeals.sort(sortByTime));
      } else {
        setMeals([]);
      }
      
      toast({
        title: 'Error loading data',
        description: 'Using default data. Changes may not be saved.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWalk = async (walkId: number, field: 'peed' | 'pooped', value: boolean) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const walkToUpdate = walks.find(w => w.id === walkId);
    
    if (!walkToUpdate) return;

    // Update local state first
    setWalks(currentWalks =>
      currentWalks.map(walk =>
        walk.id === walkId ? { ...walk, [field]: value } : walk
      )
    );

    try {
      const updateData = {
        date: today,
        time: walkToUpdate.time,
        dog_id: selectedDog.id,
        peed: field === 'peed' ? value : walkToUpdate.peed,
        pooped: field === 'pooped' ? value : walkToUpdate.pooped
      };

      console.log('Updating walk with data:', updateData);
      const { data, error } = await supabase
        .from('walks')
        .update(updateData)
        .eq('id', walkId)
        .select();

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }
      console.log('Update successful:', data);
    } catch (error) {
      console.error('Error updating walk:', error);
      // Revert local state
      setWalks(currentWalks =>
        currentWalks.map(walk =>
          walk.id === walkId ? { ...walk, [field]: !value } : walk
        )
      );
      toast({
        title: 'Error updating walk record',
        description: error.message || 'Please try again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const updateMeal = async (mealId: number, completed: boolean) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const mealToUpdate = meals.find(m => m.id === mealId);
    
    if (!mealToUpdate) return;

    // Update local state first
    setMeals(currentMeals =>
      currentMeals.map(meal =>
        meal.id === mealId ? { ...meal, completed } : meal
      )
    );

    try {
      const updateData = {
        date: today,
        time: mealToUpdate.time,
        dog_id: selectedDog.id,
        completed: completed
      };

      console.log('Updating meal with data:', updateData);
      const { data, error } = await supabase
        .from('meals')
        .update(updateData)
        .eq('id', mealId)
        .select();

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }
      console.log('Update successful:', data);
    } catch (error) {
      console.error('Error updating meal:', error);
      // Revert local state
      setMeals(currentMeals =>
        currentMeals.map(meal =>
          meal.id === mealId ? { ...meal, completed: !completed } : meal
        )
      );
      toast({
        title: 'Error updating meal record',
        description: error.message || 'Please try again',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const resetData = async () => {
    await loadTodayData(selectedDog.id);
  };

  const formatNYTime = (date: Date) => {
    const nyTime = toZonedTime(date, 'America/New_York');
    return formatTz(nyTime, 'h:mm:ss a', { timeZone: 'America/New_York' });
  };

  if (loading) {
    return (
      <ChakraProvider>
        <Center h="100vh" bg="gray.50">
          <VStack spacing={4}>
            <Icon as={FaDog} w={12} h={12} color="blue.500" />
            <Spinner size="xl" color="blue.500" />
          </VStack>
        </Center>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50" py={4} px={2}>
        <Container maxW="container.md">
          <VStack spacing={6}>
            <VStack spacing={4} w="100%">
              <VStack spacing={2} w="100%" justifyContent="center">
                <HStack spacing={4}>
                  <Icon as={FaDog} w={8} h={8} color="blue.500" />
                  <Heading color="blue.600" fontSize={{ base: "xl", md: "2xl" }}>Dog Daily Management</Heading>
                </HStack>

                <HStack spacing={2} color="gray.600">
                  <Icon as={FaClock} />
                  <Text>NY Time: {formatNYTime(currentTime)}</Text>
                </HStack>
              </VStack>
              
              {overdueNotifications.length > 0 && (
                <VStack 
                  w="100%" 
                  spacing={2} 
                  p={4} 
                  bg="red.50" 
                  borderRadius="md" 
                  borderWidth={1}
                  borderColor="red.200"
                >
                  {overdueNotifications.map((notification, index) => (
                    <Text 
                      key={index} 
                      color="red.600" 
                      fontWeight="medium"
                      fontSize="sm"
                    >
                      {notification}
                    </Text>
                  ))}
                </VStack>
              )}
              
              <VStack w="100%" spacing={4} justifyContent="center">
                <Select
                  value={selectedDog.id}
                  onChange={(e) => setSelectedDog(DOGS.find(dog => dog.id === e.target.value) || DOGS[0])}
                  width={{ base: "100%", md: "200px" }}
                  bg="white"
                >
                  {DOGS.map(dog => (
                    <option key={dog.id} value={dog.id}>{dog.name}</option>
                  ))}
                </Select>
                <Image
                  src={selectedDog.image}
                  alt={selectedDog.name}
                  boxSize={{ base: "80px", md: "100px" }}
                  objectFit="cover"
                  borderRadius="full"
                  border="3px solid"
                  borderColor="blue.500"
                />
              </VStack>
            </VStack>
            
            <Box w="100%" bg="white" p={{ base: 4, md: 6 }} borderRadius="xl" boxShadow="md">
              <HStack mb={4}>
                <Icon as={FaDog} w={6} h={6} color="blue.500" />
                <Heading size="md" color="blue.600">Walks</Heading>
              </HStack>
              <Grid 
                templateColumns={{ 
                  base: "repeat(1, 1fr)", 
                  sm: "repeat(2, 1fr)", 
                  md: "repeat(4, 1fr)" 
                }} 
                gap={4}
              >
                {walks.map(walk => (
                  <Box 
                    key={walk.id} 
                    p={4} 
                    borderWidth={1} 
                    borderRadius="lg" 
                    borderColor="gray.200"
                    bg="gray.50"
                    _hover={{ bg: 'gray.100', transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  >
                    <Text fontWeight="bold" mb={3} color="blue.600">{walk.time}</Text>
                    <VStack align="start" spacing={3}>
                      <HStack width="100%">
                        <CustomCheckbox
                          isChecked={walk.peed}
                          onChange={(e) => updateWalk(walk.id, 'peed', e.target.checked)}
                        >
                          <HStack spacing={2}>
                            <Icon as={FaTint} color={walk.peed ? "green.500" : "gray.300"} />
                            <Text>Peed</Text>
                          </HStack>
                        </CustomCheckbox>
                      </HStack>
                      <HStack width="100%">
                        <CustomCheckbox
                          isChecked={walk.pooped}
                          onChange={(e) => updateWalk(walk.id, 'pooped', e.target.checked)}
                        >
                          <HStack spacing={2}>
                            <Icon as={FaPoop} color={walk.pooped ? "green.500" : "gray.300"} />
                            <Text>Pooped</Text>
                          </HStack>
                        </CustomCheckbox>
                      </HStack>
                    </VStack>
                  </Box>
                ))}
              </Grid>
            </Box>

            {selectedDog.id === 'ricky' && (
              <Box w="100%" bg="white" p={{ base: 4, md: 6 }} borderRadius="xl" boxShadow="md">
                <HStack mb={4}>
                  <Icon as={MdRestaurant} w={6} h={6} color="green.500" />
                  <Heading size="md" color="green.600">Meals</Heading>
                </HStack>
                <Grid 
                  templateColumns={{ 
                    base: "repeat(1, 1fr)", 
                    sm: "repeat(2, 1fr)", 
                    md: "repeat(3, 1fr)" 
                  }} 
                  gap={4}
                >
                  {meals.map(meal => (
                    <Box 
                      key={meal.id} 
                      p={4} 
                      borderWidth={1} 
                      borderRadius="lg" 
                      borderColor="gray.200"
                      bg="gray.50"
                      _hover={{ bg: 'gray.100', transform: 'translateY(-2px)' }}
                      transition="all 0.2s"
                    >
                      <Text fontWeight="bold" mb={3} color="green.600">{meal.time}</Text>
                      <HStack width="100%">
                        <CustomCheckbox
                          isChecked={meal.completed}
                          onChange={(e) => updateMeal(meal.id, e.target.checked)}
                        >
                          <HStack spacing={2}>
                            <Icon 
                              as={FaBone} 
                              color={meal.completed ? "green.500" : "gray.300"}
                              transform="rotate(45deg)"
                            />
                            <Text>Fed</Text>
                          </HStack>
                        </CustomCheckbox>
                      </HStack>
                    </Box>
                  ))}
                </Grid>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App; 