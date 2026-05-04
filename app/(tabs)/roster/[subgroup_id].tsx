import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert, Modal, TextInput
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { api as supabase } from '../../../lib/api';
import { User, CheckCircle2, XCircle, Timer, X } from 'lucide-react-native';

interface Athlete {
  id: string;
  name: string;
}

export default function AthletesListScreen() {
  const { subgroup_id } = useLocalSearchParams<{ subgroup_id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  // Result Modal State
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [resultData, setResultData] = useState({
    duration: '',
    distance: '',
    rpe: '',
    notes: ''
  });
  const [savingResult, setSavingResult] = useState(false);

  const fetchAthletes = useCallback(async () => {
    try {
      if (!subgroup_id) return;

      // 1. Fetch today's workout for this subgroup
      const today = new Date().toISOString().split('T')[0];
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('id, title')
        .eq('subgroup_id', subgroup_id)
        .eq('date', today)
        .limit(1);
      
      const currentWorkout = workoutsData?.[0];
      setTodayWorkout(currentWorkout);

      // 2. Fetch attendance for this workout if it exists
      if (currentWorkout) {
        const { data: attData } = await supabase
          .from('attendance')
          .select('athlete_id, status')
          .eq('workout_id', currentWorkout.id);
        
        const attMap: Record<string, string> = {};
        (attData || []).forEach((a: any) => {
          attMap[a.athlete_id] = a.status;
        });
        setAttendance(attMap);
      }

      // 3. Fetch group_members for this subgroup
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('athlete_id')
        .eq('subgroup_id', subgroup_id);

      if (membersError) throw membersError;

      const athleteIds = membersData?.map((m: any) => m.athlete_id) || [];

      if (athleteIds.length === 0) {
        setAthletes([]);
        return;
      }

      // 4. Fetch profiles for these athletes
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', athleteIds);

      if (profilesError) throw profilesError;

      const formattedAthletes = (profilesData || []).map((p: any) => ({
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
    if (!todayWorkout) {
      Alert.alert('אין אימון היום', 'לא ניתן לסמן נוכחות ביום ללא אימון מוגדר.');
      return;
    }

    const status = isPresent ? 'present' : 'absent';
    
    // Update local state immediately for fast UI
    setAttendance(prev => ({ ...prev, [athleteId]: status }));

    try {
      // Check if attendance already exists
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('workout_id', todayWorkout.id)
        .eq('athlete_id', athleteId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('attendance')
          .update({ status })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('attendance')
          .insert({
            workout_id: todayWorkout.id,
            athlete_id: athleteId,
            status: status
          });
      }
    } catch (error) {
      console.error('Attendance update failed:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן נוכחות בשרת.');
    }
  };

  const openResultModal = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setResultData({ duration: '', distance: '', rpe: '', notes: '' });
    setResultModalVisible(true);
  };

  const handleSaveResult = async () => {
    if (!selectedAthlete) return;
    setSavingResult(true);
    try {
      await supabase.from('performance_results').insert({
        athlete_id: selectedAthlete.id,
        subgroup_id: subgroup_id,
        workout_id: todayWorkout?.id || null,
        duration_min: resultData.duration ? parseInt(resultData.duration) : null,
        distance_km: resultData.distance ? parseFloat(resultData.distance) : null,
        rpe: resultData.rpe ? parseInt(resultData.rpe) : null,
        notes: resultData.notes,
        recorded_at: new Date().toISOString().split('T')[0]
      });
      setResultModalVisible(false);
      Alert.alert('הצלחה', 'התוצאה נשמרה בהצלחה.');
    } catch (e) {
      Alert.alert('שגיאה', 'שמירת התוצאה נכשלה.');
    } finally {
      setSavingResult(false);
    }
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
        <View className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 mb-6">
           <Text className="text-white text-right text-base font-bold mb-1">
             {todayWorkout ? `אימון היום: ${todayWorkout.title}` : 'אין אימון מתוזמן להיום'}
           </Text>
           <Text className="text-neutral-500 text-right text-sm">
             {todayWorkout ? 'ניתן לסמן נוכחות ולתעד תוצאות.' : 'חזור ליומן כדי לתזמן אימון.'}
           </Text>
        </View>

        {athletes.length === 0 ? (
          <View className="bg-[#111111] border border-neutral-800 rounded-2xl p-8 items-center mt-4">
            <User color="#525252" size={40} />
            <Text className="text-neutral-500 text-center mt-4 font-medium">
              לא נמצאו מתאמנים בקבוצה זו.
            </Text>
          </View>
        ) : (
          athletes.map(athlete => {
            const isPresent = attendance[athlete.id] === 'present';
            const isAbsent = attendance[athlete.id] === 'absent';

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
                    onPress={() => openResultModal(athlete)}
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

      {/* Result Modal */}
      <Modal
        visible={resultModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResultModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111111] rounded-t-[32px] p-6 border-t border-neutral-800">
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity onPress={() => setResultModalVisible(false)} className="p-2">
                <X color="#52525b" size={24} />
              </TouchableOpacity>
              <Text className="text-white text-xl font-bold">רישום תוצאה - {selectedAthlete?.name}</Text>
            </View>

            <View className="space-y-4">
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-neutral-400 text-right mb-2 text-sm">מרחק (ק״מ)</Text>
                  <TextInput
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-right"
                    placeholder="0.0"
                    placeholderTextColor="#52525b"
                    keyboardType="numeric"
                    value={resultData.distance}
                    onChangeText={v => setResultData(prev => ({ ...prev, distance: v }))}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-neutral-400 text-right mb-2 text-sm">זמן (דקות)</Text>
                  <TextInput
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-right"
                    placeholder="0"
                    placeholderTextColor="#52525b"
                    keyboardType="numeric"
                    value={resultData.duration}
                    onChangeText={v => setResultData(prev => ({ ...prev, duration: v }))}
                  />
                </View>
              </View>

              <View>
                <Text className="text-neutral-400 text-right mb-2 text-sm">רמת מאמץ (RPE 1-10)</Text>
                <TextInput
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-right"
                  placeholder="1-10"
                  placeholderTextColor="#52525b"
                  keyboardType="numeric"
                  value={resultData.rpe}
                  onChangeText={v => setResultData(prev => ({ ...prev, rpe: v }))}
                />
              </View>

              <View>
                <Text className="text-neutral-400 text-right mb-2 text-sm">הערות</Text>
                <TextInput
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-right min-h-[80px]"
                  placeholder="איך היה האימון?"
                  placeholderTextColor="#52525b"
                  multiline
                  value={resultData.notes}
                  onChangeText={v => setResultData(prev => ({ ...prev, notes: v }))}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveResult}
                disabled={savingResult}
                className={`bg-[#22c55e] rounded-2xl p-4 items-center mt-6 ${savingResult ? 'opacity-50' : ''}`}
              >
                {savingResult ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-lg">שמור תוצאה</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

