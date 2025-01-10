import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  Select,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Grid,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { SupabaseClient } from '@supabase/supabase-js';

interface AnalyticsProps {
  supabase: SupabaseClient;
  selectedDog: { id: number; name: string };
}

interface DailyStats {
  date: string;
  peeCount: number;
  poopCount: number;
}

interface MonthlyComparison {
  currentMonth: {
    peeCount: number;
    poopCount: number;
  };
  previousMonth: {
    peeCount: number;
    poopCount: number;
  };
}

const Analytics: React.FC<AnalyticsProps> = ({ supabase, selectedDog }) => {
  const [timeRange, setTimeRange] = useState<'month' | 'year' | 'all'>('month');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison>({
    currentMonth: { peeCount: 0, poopCount: 0 },
    previousMonth: { peeCount: 0, poopCount: 0 },
  });

  const lineColors = {
    pee: useColorModeValue('#3182CE', '#63B3ED'),
    poop: useColorModeValue('#805AD5', '#B794F4'),
  };

  const fetchMonthlyComparison = async () => {
    const currentMonth = new Date();
    const previousMonth = subMonths(currentMonth, 1);

    const currentMonthStart = startOfMonth(currentMonth);
    const currentMonthEnd = endOfMonth(currentMonth);
    const previousMonthStart = startOfMonth(previousMonth);
    const previousMonthEnd = endOfMonth(previousMonth);

    // Fetch current month stats
    const { data: currentData } = await supabase
      .from('walks')
      .select('peed, pooped')
      .eq('dog_id', selectedDog.id)
      .gte('date', format(currentMonthStart, 'yyyy-MM-dd'))
      .lte('date', format(currentMonthEnd, 'yyyy-MM-dd'));

    // Fetch previous month stats
    const { data: previousData } = await supabase
      .from('walks')
      .select('peed, pooped')
      .eq('dog_id', selectedDog.id)
      .gte('date', format(previousMonthStart, 'yyyy-MM-dd'))
      .lte('date', format(previousMonthEnd, 'yyyy-MM-dd'));

    const currentStats = {
      peeCount: currentData?.filter(d => d.peed).length || 0,
      poopCount: currentData?.filter(d => d.pooped).length || 0,
    };

    const previousStats = {
      peeCount: previousData?.filter(d => d.peed).length || 0,
      poopCount: previousData?.filter(d => d.pooped).length || 0,
    };

    setMonthlyComparison({
      currentMonth: currentStats,
      previousMonth: previousStats,
    });
  };

  const fetchDailyStats = async () => {
    const currentDate = new Date();
    let startDate: Date;
    let endDate = currentDate;

    switch (timeRange) {
      case 'month':
        startDate = subMonths(currentDate, 1);
        break;
      case 'year':
        startDate = subMonths(currentDate, 12);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1); // Arbitrary start date
        break;
      default:
        startDate = subMonths(currentDate, 1);
    }

    const { data } = await supabase
      .from('walks')
      .select('date, peed, pooped')
      .eq('dog_id', selectedDog.id)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'));

    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const stats = dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayData = data?.filter(d => d.date === dateStr) || [];
      return {
        date: format(date, 'MMM dd'),
        peeCount: dayData.filter(d => d.peed).length,
        poopCount: dayData.filter(d => d.pooped).length,
      };
    });

    setDailyStats(stats);
  };

  useEffect(() => {
    fetchMonthlyComparison();
    fetchDailyStats();
  }, [selectedDog.id, timeRange]);

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <VStack spacing={8} w="100%" align="stretch">
      <Box>
        <Heading size="lg" mb={4}>Analytics for {selectedDog.name}</Heading>
        <Select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as 'month' | 'year' | 'all')}
          maxW="200px"
        >
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
          <option value="all">All Time</option>
        </Select>
      </Box>

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
        <Stat>
          <StatLabel>Pee Count (This Month)</StatLabel>
          <StatNumber>{monthlyComparison.currentMonth.peeCount}</StatNumber>
          <StatHelpText>
            <StatArrow
              type={monthlyComparison.currentMonth.peeCount >= monthlyComparison.previousMonth.peeCount ? 'increase' : 'decrease'}
            />
            {calculatePercentageChange(
              monthlyComparison.currentMonth.peeCount,
              monthlyComparison.previousMonth.peeCount
            ).toFixed(1)}% from last month
          </StatHelpText>
        </Stat>

        <Stat>
          <StatLabel>Poop Count (This Month)</StatLabel>
          <StatNumber>{monthlyComparison.currentMonth.poopCount}</StatNumber>
          <StatHelpText>
            <StatArrow
              type={monthlyComparison.currentMonth.poopCount >= monthlyComparison.previousMonth.poopCount ? 'increase' : 'decrease'}
            />
            {calculatePercentageChange(
              monthlyComparison.currentMonth.poopCount,
              monthlyComparison.previousMonth.poopCount
            ).toFixed(1)}% from last month
          </StatHelpText>
        </Stat>
      </Grid>

      <Box h="400px">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dailyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="peeCount"
              stroke={lineColors.pee}
              name="Pee Count"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="poopCount"
              stroke={lineColors.poop}
              name="Poop Count"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </VStack>
  );
};

export default Analytics; 