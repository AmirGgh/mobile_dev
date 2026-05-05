import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, MapPin, Clock, ChevronRight } from 'lucide-react-native';
import { api as supabase } from '../../lib/api';
import { useLanguage } from '../../lib/LanguageContext';

interface Workout {
  id: string;
  title: string;
  date: string;
  type: string;
  time?: string;
  subgroup_name?: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const { t, language } = useLanguage();

  const fetchWorkouts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get coach's group
      const { data: group } = await supabase
        .from('groups')
        .select('id')
        .eq('head_coach_id', user.id)
        .maybeSingle();

      if (!group) {
        setWorkouts([]);
        return;
      }

      // 2. Get subgroups
      const { data: sgs } = await supabase
        .from('subgroups')
        .select('id, name')
        .eq('group_id', group.id);
      
      const sgMap: Record<string, string> = {};
      (sgs || []).forEach((s: any) => sgMap[s.id] = s.name);

      // 3. Get workouts
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('*')
        .in('subgroup_id', Object.keys(sgMap))
        .order('date', { ascending: true });

      const formatted = (workoutsData || []).map((w: any) => ({
        ...w,
        subgroup_name: sgMap[w.subgroup_id]
      }));

      setWorkouts(formatted);
    } catch (err) {
      console.error('[Calendar] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWorkouts();
  }, [fetchWorkouts]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  // Group workouts by date
  const groupedWorkouts: Record<string, Workout[]> = {};
  workouts.forEach(w => {
    if (!groupedWorkouts[w.date]) groupedWorkouts[w.date] = [];
    groupedWorkouts[w.date].push(w);
  });

  const sortedDates = Object.keys(groupedWorkouts).sort();

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
      >
        <View className="flex-row items-center justify-end gap-3 mb-8">
          <Text className="text-white text-2xl font-bold">{t('לוח אימונים', 'Calendar')}</Text>
          <View className="w-10 h-10 rounded-xl bg-[#22c55e]/10 items-center justify-center">
            <CalendarDays color="#22c55e" size={24} />
          </View>
        </View>

        {workouts.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-neutral-500 text-center">{t('אין אימונים מתוזמנים', 'No scheduled workouts')}</Text>
          </View>
        ) : (
          sortedDates.map(date => (
            <View key={date} className="mb-6">
              <Text className="text-neutral-400 text-right font-bold mb-3 mr-2">
                {new Date(date).toLocaleDateString(language === 'en' ? 'en-US' : 'he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              {groupedWorkouts[date].map(workout => (
                <TouchableOpacity
                  key={workout.id}
                  onPress={() => router.push(`/workout/${workout.id}`)}
                  className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
                >
                  <ChevronRight color="#52525b" size={18} />
                  <View className="items-end flex-1 mr-4">
                    <Text className="text-white font-bold text-lg mb-1">{workout.title}</Text>
                    <View className="flex-row items-center gap-3">
                       <Text className="text-neutral-500 text-sm">{workout.subgroup_name}</Text>
                       <View className="flex-row items-center gap-1">
                         <Text className="text-neutral-400 text-xs">{workout.time || '--:--'}</Text>
                         <Clock color="#737373" size={12} />
                       </View>
                    </View>
                  </View>
                  <View className={`w-12 h-12 rounded-xl items-center justify-center ${
                    workout.type === 'run' ? 'bg-orange-500/10' : 
                    workout.type === 'bike' ? 'bg-blue-500/10' : 
                    workout.type === 'swim' ? 'bg-cyan-500/10' : 'bg-neutral-800'
                  }`}>
                    <Text className="text-lg">
                      {workout.type === 'run' ? '🏃' : 
                       workout.type === 'bike' ? '🚴' : 
                       workout.type === 'swim' ? '🏊' : '💪'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
