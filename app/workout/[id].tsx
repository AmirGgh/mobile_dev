import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { api as supabase } from '../../lib/api';
import { Clock, Calendar, Info, MapPin, ChevronRight, ArrowRight } from 'lucide-react-native';

interface StructuredExercise {
  phase: string;
  duration_min?: number;
  distance_km?: number;
  description: string;
  rpe_target?: number;
}

interface Workout {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  time?: string;
  planned_duration_min?: number;
  planned_distance_km?: number;
  structured_content?: StructuredExercise[];
}

export default function WorkoutDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (id) fetchWorkout();
  }, [id]);

  async function fetchWorkout() {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setWorkout(data);
    } catch (err) {
      console.error('[WorkoutDetails] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b]">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-white text-lg">האימון לא נמצא</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <Stack.Screen options={{ 
        title: 'פרטי אימון',
        headerShown: false
      }} />
      
      <View className="px-4 py-2 flex-row items-center justify-between border-b border-neutral-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ArrowRight color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">פרטי אימון</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View className="bg-[#111111] border border-neutral-800 rounded-3xl p-6 mb-6">
          <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-4 ${
            workout.type === 'run' ? 'bg-orange-500/10' : 
            workout.type === 'bike' ? 'bg-blue-500/10' : 
            workout.type === 'swim' ? 'bg-cyan-500/10' : 'bg-neutral-800'
          }`}>
            <Text className="text-2xl">
              {workout.type === 'run' ? '🏃' : 
               workout.type === 'bike' ? '🚴' : 
               workout.type === 'swim' ? '🏊' : '💪'}
            </Text>
          </View>
          <Text className="text-white text-2xl font-black mb-2 text-right">{workout.title}</Text>
          <View className="flex-row items-center justify-end gap-4">
             <View className="flex-row items-center gap-1">
               <Text className="text-neutral-400 text-sm">{workout.date}</Text>
               <Calendar color="#737373" size={14} />
             </View>
             {workout.time && (
               <View className="flex-row items-center gap-1">
                 <Text className="text-neutral-400 text-sm">{workout.time}</Text>
                 <Clock color="#737373" size={14} />
               </View>
             )}
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 items-center">
            <Text className="text-neutral-500 text-xs mb-1">זמן מתוכנן</Text>
            <Text className="text-white font-bold">{workout.planned_duration_min || '--'} דק'</Text>
          </View>
          <View className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 items-center">
            <Text className="text-neutral-500 text-xs mb-1">מרחק מתוכנן</Text>
            <Text className="text-white font-bold">{workout.planned_distance_km || '--'} ק״מ</Text>
          </View>
        </View>

        {/* Description */}
        {workout.description && (
          <View className="mb-8">
            <View className="flex-row items-center justify-end gap-2 mb-3">
              <Text className="text-white font-bold text-lg">תיאור האימון</Text>
              <Info color="#22c55e" size={20} />
            </View>
            <Text className="text-neutral-400 text-right leading-6 text-base">
              {workout.description}
            </Text>
          </View>
        )}

        {/* Structured Content */}
        {workout.structured_content && workout.structured_content.length > 0 && (
          <View className="mb-10">
            <Text className="text-white font-bold text-lg mb-4 text-right">מבנה האימון</Text>
            {workout.structured_content.map((step, idx) => (
              <View key={idx} className="bg-[#111111] border-r-4 border-r-[#22c55e] border border-neutral-800 rounded-xl p-4 mb-3">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-row gap-2">
                    {step.duration_min && (
                       <View className="bg-neutral-800 px-2 py-1 rounded-md">
                         <Text className="text-neutral-400 text-xs">{step.duration_min} דק'</Text>
                       </View>
                    )}
                    {step.rpe_target && (
                       <View className="bg-orange-500/10 px-2 py-1 rounded-md">
                         <Text className="text-orange-500 text-xs">RPE {step.rpe_target}</Text>
                       </View>
                    )}
                  </View>
                  <Text className="text-[#22c55e] font-bold text-sm">
                    {step.phase === 'warmup' ? 'חימום' : step.phase === 'main' ? 'סט מרכזי' : 'שחרור'}
                  </Text>
                </View>
                <Text className="text-neutral-300 text-right leading-5">{step.description}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
