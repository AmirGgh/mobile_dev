import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { api as supabase } from '../../../lib/api';
import { User, CheckCircle2, XCircle, Timer } from 'lucide-react-native';

interface Athlete {
  id: string;
  name: string;
}

export default function AthletesListScreen() {
  const { subgroup_id } = useLocalSearchParams<{ subgroup_id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  
  // Local state for attendance (true = present, false = absent, undefined = not marked)
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  const fetchAthletes = useCallback(async () => {
    try {
      if (!subgroup_id) return;

      // Fetch group_members for this subgroup
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('athlete_id')
        .eq('subgroup_id', subgroup_id);

      if (membersError) throw membersError;

      const athleteIds = membersData?.map(m => m.athlete_id) || [];

      if (athleteIds.length === 0) {
        setAthletes([]);
        return;
      }

      // Fetch profiles for these athletes
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', athleteIds);

      if (profilesError) throw profilesError;

      const formattedAthletes = (profilesData || []).map(p => ({
        id: p.id,
        name: p.full_name || 'מתאמן ללא שם',
      }));

      setAthletes(formattedAthletes);
    } catch (err) {
      console.error('[Athletes] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subgroup_id]);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAthletes();
  }, [fetchAthletes]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const toggleAttendance = async (athleteId: string, isPresent: boolean) => {
    // Update local state immediately for fast UI
    setAttendance(prev => ({ ...prev, [athleteId]: isPresent }));

    // TODO: Connect to Supabase attendance table
    // Example implementation once the table exists:
    /*
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('attendance').upsert({
      athlete_id: athleteId,
      subgroup_id: subgroup_id,
      date: today,
      status: isPresent ? 'present' : 'absent'
    }, { onConflict: 'athlete_id, date' });
    
    if (error) {
      console.error('Attendance update failed:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן נוכחות');
      // Revert local state
    }
    */
  };

  const handleLogResult = (athlete: Athlete) => {
    Alert.alert('רישום תוצאה', `פתיחת טופס רישום תוצאה עבור ${athlete.name}`);
    // TODO: Build modal or navigate to result logging screen
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <Stack.Screen options={{ title: 'רשימת מתאמנים' }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
      >
        <Text className="text-white text-right text-base mb-6 text-neutral-400">
          סימון נוכחות יומי ורישום תוצאות למתאמנים בקבוצה.
        </Text>

        {athletes.length === 0 ? (
          <View className="bg-[#111111] border border-neutral-800 rounded-2xl p-8 items-center mt-4">
            <User color="#525252" size={40} />
            <Text className="text-neutral-500 text-center mt-4 font-medium">
              לא נמצאו מתאמנים בקבוצה זו.
            </Text>
          </View>
        ) : (
          athletes.map(athlete => {
            const isPresent = attendance[athlete.id] === true;
            const isAbsent = attendance[athlete.id] === false;

            return (
              <View
                key={athlete.id}
                style={{
                  backgroundColor: '#111111',
                  borderWidth: 1,
                  borderColor: '#262626',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                {/* Header: Avatar + Name */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16, marginRight: 12 }}>
                    {athlete.name}
                  </Text>
                  <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: '#262626',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: '#a3a3a3', fontWeight: 'bold', fontSize: 14 }}>
                      {athlete.name.substring(0, 2)}
                    </Text>
                  </View>
                </View>

                {/* Actions: Attendance + Result Logging */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  
                  {/* Log Result Button */}
                  <TouchableOpacity
                    onPress={() => handleLogResult(athlete)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
                      borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
                    }}
                  >
                    <Timer color="#3b82f6" size={16} />
                    <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 13 }}>
                      רישום תוצאה
                    </Text>
                  </TouchableOpacity>

                  {/* Attendance Toggles */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => toggleAttendance(athlete.id, false)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: isAbsent ? 'rgba(239,68,68,0.15)' : '#1a1a1a',
                        borderWidth: 1, borderColor: isAbsent ? '#ef4444' : '#262626',
                        borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
                      }}
                    >
                      <XCircle color={isAbsent ? '#ef4444' : '#52525b'} size={18} />
                      <Text style={{ color: isAbsent ? '#ef4444' : '#52525b', fontWeight: '600', fontSize: 13 }}>
                        חיסור
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => toggleAttendance(athlete.id, true)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: isPresent ? 'rgba(34,197,94,0.15)' : '#1a1a1a',
                        borderWidth: 1, borderColor: isPresent ? '#22c55e' : '#262626',
                        borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
                      }}
                    >
                      <CheckCircle2 color={isPresent ? '#22c55e' : '#52525b'} size={18} />
                      <Text style={{ color: isPresent ? '#22c55e' : '#52525b', fontWeight: '600', fontSize: 13 }}>
                        נוכח/ת
                      </Text>
                    </TouchableOpacity>
                  </View>

                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
