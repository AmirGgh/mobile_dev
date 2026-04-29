import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api as supabase } from '../../lib/api';
import {
  Home, Users, Dumbbell, Sparkles, ChevronDown, ChevronUp,
  Waves, Bike, PersonStanding, CalendarDays,
} from 'lucide-react-native';

import { WorkoutCard, Workout } from '../../components/WorkoutCard';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subgroup {
  id: string;
  name: string;
}


// ─── Subgroup Card (expandable) ───────────────────────────────────────────────
function SubgroupCard({
  subgroup, workouts, onGeneratePlan,
}: {
  subgroup: Subgroup;
  workouts: Workout[];
  onGeneratePlan: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const hasWorkouts = workouts.length > 0;

  return (
    <View style={{
      backgroundColor: '#0d0d0d', borderWidth: 1, borderColor: '#1a1a1a',
      borderRadius: 18, marginBottom: 14, overflow: 'hidden',
    }}>
      {/* Header */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/roster')}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingVertical: 14,
        }}
      >
        <TouchableOpacity 
          onPress={() => hasWorkouts && setExpanded(!expanded)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4 }}
        >
          {hasWorkouts
            ? (expanded ? <ChevronUp color="#6b7280" size={18} /> : <ChevronDown color="#6b7280" size={18} />)
            : null
          }
          {hasWorkouts && (
            <View style={{
              backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 12,
              paddingHorizontal: 8, paddingVertical: 2,
            }}>
              <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }}>
                {workouts.length} אימונים
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
            {subgroup.name}
          </Text>
          <View style={{
            width: 32, height: 32, borderRadius: 10,
            backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Users color="#22c55e" size={16} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded workouts */}
      {expanded && hasWorkouts && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          {workouts.slice(0, 10).map(w => <WorkoutCard key={w.id} workout={w} />)}
          {workouts.length > 10 && (
            <Text style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              + {workouts.length - 10} אימונים נוספים
            </Text>
          )}
        </View>
      )}

      {/* Empty state */}
      {!hasWorkouts && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ color: '#525252', fontSize: 13, textAlign: 'right', marginBottom: 12 }}>
            0 אימונים נמצאו - צור תוכנית חדשה
          </Text>
          <TouchableOpacity
            onPress={onGeneratePlan}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
              borderRadius: 14, paddingVertical: 12,
            }}
          >
            <Sparkles color="#22c55e" size={18} />
            <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 14 }}>
              ייצר תוכנית עם AI ✨
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Main Dashboard Screen ────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [workoutsMap, setWorkoutsMap] = useState<Record<string, Workout[]>>({});
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  // ── Fetch data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Profile name
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (profile?.full_name) setUserName(profile.full_name);

      // Coach's group → subgroups
      const { data: groupRow } = await supabase
        .from('groups').select('id').eq('head_coach_id', user.id).maybeSingle();

      if (!groupRow) {
        setLoading(false);
        return;
      }

      const { data: sgs } = await supabase
        .from('subgroups').select('id, name').eq('group_id', groupRow.id);

      const subgroupList = (sgs ?? []) as Subgroup[];
      setSubgroups(subgroupList);

      if (subgroupList.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch upcoming workouts for all subgroups
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      console.log("[Dashboard] Fetching workouts >= ", today, " for coach ", user.id);
      
      const subgroupIds = subgroupList.map(s => s.id);

      const { data: workouts, error } = await supabase
        .from('workouts')
        .select('id, title, description, date, type, subgroup_id')
        .in('subgroup_id', subgroupIds)
        .gte('date', today)
        .order('date', { ascending: true });

      console.log("[Dashboard] Fetched workouts:", workouts);
      if (error) console.log("[Dashboard] Fetch error details:", error);

      // Group by subgroup
      const map: Record<string, Workout[]> = {};
      let total = 0;
      subgroupList.forEach(sg => { map[sg.id] = []; });

      (workouts ?? []).forEach((w: any) => {
        if (map[w.subgroup_id]) {
          map[w.subgroup_id].push(w as Workout);
          total++;
        }
      });

      setWorkoutsMap(map);
      setTotalWorkouts(total);
    } catch (err) {
      console.error('[Dashboard] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleGeneratePlan = () => {
    Alert.alert(
      'בקרוב! 🚀',
      'פיצ׳ר יצירת תוכניות שוטפות יתווסף בקרוב. ניתן ליצור תוכנית דרך תהליך ההרשמה.',
    );
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 14 }}>טוען דשבורד...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 6 }}>
            <Text style={{ color: '#ffffff', fontSize: 26, fontWeight: '900' }}>
              {userName ? `היי, ${userName} 👋` : 'הדשבורד שלך'}
            </Text>
            <View style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Home color="#22c55e" size={22} />
            </View>
          </View>
          <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'right' }}>
            ניהול קבוצות ותוכניות אימון
          </Text>
        </View>

        {/* Stats Bar */}
        <View style={{
          flexDirection: 'row', gap: 10, marginBottom: 24,
        }}>
          <View style={{
            flex: 1, backgroundColor: '#111111', borderWidth: 1, borderColor: '#262626',
            borderRadius: 16, padding: 16, alignItems: 'center',
          }}>
            <Text style={{ color: '#22c55e', fontSize: 24, fontWeight: '900' }}>{subgroups.length}</Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>קבוצות</Text>
          </View>
          <View style={{
            flex: 1, backgroundColor: '#111111', borderWidth: 1, borderColor: '#262626',
            borderRadius: 16, padding: 16, alignItems: 'center',
          }}>
            <Text style={{ color: '#3b82f6', fontSize: 24, fontWeight: '900' }}>{totalWorkouts}</Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>אימונים קרובים</Text>
          </View>
        </View>

        {/* Subgroups Section */}
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>הקבוצות שלך</Text>
            <Users color="#22c55e" size={20} />
          </View>

          {subgroups.length === 0 ? (
            <View style={{
              backgroundColor: '#111111', borderWidth: 1, borderColor: '#262626',
              borderRadius: 18, padding: 28, alignItems: 'center',
            }}>
              <Users color="#525252" size={36} />
              <Text style={{ color: '#6b7280', fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
                עדיין לא נוצרו קבוצות
              </Text>
              <Text style={{ color: '#525252', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                צור קבוצות דרך תהליך ההרשמה כדי להתחיל
              </Text>
            </View>
          ) : (
            subgroups.map(sg => (
              <SubgroupCard
                key={sg.id}
                subgroup={sg}
                workouts={workoutsMap[sg.id] ?? []}
                onGeneratePlan={handleGeneratePlan}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
