import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert, Modal, TextInput
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { api as supabase } from '../../../lib/api';
import { User, CheckCircle2, XCircle, Timer, X, Star, Trophy, Award } from 'lucide-react-native';
import { awardCoachExcellence, awardRaceParticipation } from '../../../lib/xp-service';
import { useLanguage } from '../../../lib/LanguageContext';

interface Athlete {
  id: string;
  name: string;
  total_xp: number;
  level: number;
}

export default function AthletesListScreen() {
  const { subgroup_id } = useLocalSearchParams<{ subgroup_id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const { t } = useLanguage();

  // XP Modal State
  const [xpModalVisible, setXpModalVisible] = useState(false);
  const [xpAwardType, setXpAwardType] = useState<'race' | 'excellence'>('excellence');
  const [xpReason, setXpReason] = useState('');
  const [awardingXp, setAwardingXp] = useState(false);

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
        .select('id, full_name, total_xp, level')
        .in('id', athleteIds);

      if (profilesError) throw profilesError;

      const formattedAthletes = (profilesData || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || 'מתאמן ללא שם',
        total_xp: p.total_xp || 0,
        level: p.level || 1,
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

  const handleAwardXp = async () => {
    if (!selectedAthlete || !xpReason.trim()) return;
    setAwardingXp(true);
    try {
      if (xpAwardType === 'race') {
        await awardRaceParticipation(selectedAthlete.id, xpReason);
      } else {
        await awardCoachExcellence(selectedAthlete.id, xpReason);
      }
      setXpModalVisible(false);
      setXpReason('');
      Alert.alert(t('הצלחה', 'Success'), t('XP הוענק בהצלחה', 'XP awarded successfully'));
      fetchAthletes();
    } catch (e) {
      Alert.alert(t('שגיאה', 'Error'), t('שגיאה בהענקת XP', 'Error awarding XP'));
    } finally {
      setAwardingXp(false);
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
           <View className="flex-row justify-between items-start mb-2">
             <TouchableOpacity 
               onPress={() => router.push(`/benchmarks/${subgroup_id}`)}
               className="bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 flex-row items-center gap-2"
             >
               <Trophy color="#a855f7" size={16} />
               <Text className="text-[#a855f7] font-bold text-xs">{t('מדדים', 'Benchmarks')}</Text>
             </TouchableOpacity>
             <Text className="text-white text-right text-base font-bold">
               {todayWorkout ? `אימון היום: ${todayWorkout.title}` : t('אין אימון להיום', 'No workout today')}
             </Text>
           </View>
           <Text className="text-neutral-500 text-right text-sm">
             {todayWorkout ? t('ניתן לסמן נוכחות ולתעד תוצאות.', 'You can mark attendance and log results.') : t('חזור ליומן כדי לתזמן אימון.', 'Go back to calendar to schedule.')}
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
                  <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
                      {athlete.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: '#a3a3a3', fontSize: 12 }}>{t('רמה', 'Lv')} {athlete.level}</Text>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#404040' }} />
                      <Text style={{ color: '#a3a3a3', fontSize: 12 }}>{athlete.total_xp} XP</Text>
                    </View>
                  </View>
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: '#1a1a1a',
                    borderWidth: 1, borderColor: '#262626',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 16 }}>
                      {athlete.name.substring(0, 1)}
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
                      {t('רישום תוצאה', 'Result')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedAthlete(athlete);
                      setXpAwardType('excellence');
                      setXpReason('');
                      setXpModalVisible(true);
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: 'rgba(245,158,11,0.1)',
                      borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
                      borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
                    }}
                  >
                    <Star color="#f59e0b" size={16} />
                    <Text style={{ color: '#f59e0b', fontWeight: '600', fontSize: 13 }}>
                      {t('הענק XP', 'Award XP')}
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

      {/* XP Award Modal */}
      <Modal
        visible={xpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setXpModalVisible(false)}
      >
        <View className="flex-1 justify-center bg-black/80 px-6">
          <View className="bg-[#111111] rounded-[32px] p-6 border border-neutral-800">
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity onPress={() => setXpModalVisible(false)} className="p-2">
                <X color="#52525b" size={24} />
              </TouchableOpacity>
              <Text className="text-white text-xl font-bold">{t('הענקת XP למתאמן', 'Award XP')}</Text>
            </View>

            <View className="flex-row gap-2 mb-6">
              <TouchableOpacity 
                onPress={() => setXpAwardType('excellence')}
                className={`flex-1 p-3 rounded-xl border items-center ${xpAwardType === 'excellence' ? 'bg-primary/10 border-primary' : 'bg-neutral-900 border-neutral-800'}`}
              >
                <Award color={xpAwardType === 'excellence' ? '#22c55e' : '#52525b'} size={24} />
                <Text className={`mt-2 text-xs font-bold ${xpAwardType === 'excellence' ? 'text-primary' : 'text-neutral-500'}`}>{t('מצוינות', 'Excellence')}</Text>
                <Text className="text-[10px] text-neutral-500">+20 XP</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setXpAwardType('race')}
                className={`flex-1 p-3 rounded-xl border items-center ${xpAwardType === 'race' ? 'bg-amber-500/10 border-amber-500' : 'bg-neutral-900 border-neutral-800'}`}
              >
                <Trophy color={xpAwardType === 'race' ? '#f59e0b' : '#52525b'} size={24} />
                <Text className={`mt-2 text-xs font-bold ${xpAwardType === 'race' ? 'text-amber-500' : 'text-neutral-500'}`}>{t('תחרות', 'Race')}</Text>
                <Text className="text-[10px] text-neutral-500">+15 XP</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-neutral-400 text-right mb-2 text-sm">{t('סיבה / שם התחרות', 'Reason / Race Name')}</Text>
            <TextInput
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-right mb-6"
              placeholder={xpAwardType === 'race' ? t('לדוגמה: מרתון תל אביב', 'e.g. Marathon Tel Aviv') : t('לדוגמה: השקעה יוצאת דופן', 'e.g. Exceptional Effort')}
              placeholderTextColor="#52525b"
              value={xpReason}
              onChangeText={setXpReason}
            />

            <TouchableOpacity
              onPress={handleAwardXp}
              disabled={awardingXp || !xpReason.trim()}
              className={`bg-[#22c55e] rounded-2xl p-4 items-center ${awardingXp || !xpReason.trim() ? 'opacity-50' : ''}`}
            >
              {awardingXp ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-lg">{t('הענק XP', 'Award XP')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

