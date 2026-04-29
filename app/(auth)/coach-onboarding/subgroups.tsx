import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
  Alert, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { api as supabase } from '../../../lib/api';
import { Plus, ChevronLeft, Check, ChevronDown } from 'lucide-react-native';

// ─── Constants ───────────────────────────────────────────────────────────────
const SPORTS_OPTIONS = ['שחייה', 'אופניים', 'ריצה', 'טריאתלון'];
const LEVELS = ['מתחילים', 'בינוניים', 'תחרותיים'];
const DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const DAY_SPORTS = [
  { key: 'swim',  label: 'שחייה',  color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  { key: 'bike',  label: 'אופניים', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  { key: 'run',   label: 'ריצה',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  { key: 'strength', label: 'כוח', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type DaySchedule = { [sportKey: string]: boolean };
type Schedule = { [day: string]: DaySchedule };

interface Subgroup {
  id: number;
  name: string;
  sport: string;
  level: string;
  goal: string;
  schedule: Schedule;
}

const makeEmptySchedule = (): Schedule =>
  Object.fromEntries(DAYS.map(d => [d, {}]));

const makeNewSubgroup = (id: number): Subgroup => ({
  id,
  name: '',
  sport: 'טריאתלון',
  level: 'בינוניים',
  goal: '',
  schedule: makeEmptySchedule(),
});

// ─── Sport Dropdown ───────────────────────────────────────────────────────────
function SportDropdown({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="bg-[#111111] border border-neutral-800 rounded-xl h-12 px-4 flex-row items-center justify-between"
      >
        <ChevronDown color="#6b7280" size={18} />
        <Text className="text-white text-base">{value}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-center items-center px-10"
          onPress={() => setOpen(false)}
          activeOpacity={1}
        >
          <View className="bg-[#1c1c1e] border border-neutral-800 rounded-2xl w-full overflow-hidden">
            {SPORTS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => { onChange(s); setOpen(false); }}
                className={`flex-row items-center justify-between px-5 py-4 border-b border-neutral-800/60 ${s === value ? 'bg-[#22c55e]/10' : ''}`}
              >
                <Text className={s === value ? 'text-[#22c55e] font-bold' : 'text-white'}>{s}</Text>
                {s === value && <Check color="#22c55e" size={18} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Day × Sport Matrix ───────────────────────────────────────────────────────
function DayScheduleMatrix({
  schedule,
  onChange,
}: {
  schedule: Schedule;
  onChange: (s: Schedule) => void;
}) {
  const toggle = (day: string, sportKey: string) => {
    const next = { ...schedule, [day]: { ...schedule[day], [sportKey]: !schedule[day][sportKey] } };
    onChange(next);
  };

  return (
    <View>
      <Text className="text-neutral-400 text-sm mb-3 text-right font-medium">ימי אימון וסוג:</Text>
      {DAYS.map((day) => {
        const hasSport = Object.values(schedule[day] || {}).some(Boolean);
        return (
          <View key={day} className="flex-row items-center justify-end mb-3" style={{ gap: 8 }}>
            {/* Sport pills — right-to-left so כוח is furthest left */}
            <View className="flex-row items-center" style={{ gap: 6 }}>
              {DAY_SPORTS.map((sp) => {
                const active = schedule[day]?.[sp.key];
                return (
                  <TouchableOpacity
                    key={sp.key}
                    onPress={() => toggle(day, sp.key)}
                    style={{
                      backgroundColor: active ? sp.bg : 'transparent',
                      borderColor: active ? sp.color : '#404040',
                      borderWidth: 1,
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: active ? sp.color : '#71717a', fontSize: 12, fontWeight: active ? '700' : '400' }}>
                      {sp.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Day circle */}
            <View
              style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: hasSport ? '#22c55e' : '#1c1c1e',
                borderWidth: 1,
                borderColor: hasSport ? '#22c55e' : '#404040',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: hasSport ? '#09090b' : '#9ca3af', fontWeight: '700', fontSize: 14 }}>
                {day}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Subgroup Card ────────────────────────────────────────────────────────────
function SubgroupCard({
  sg, index, onUpdate,
}: { sg: Subgroup; index: number; onUpdate: (sg: Subgroup) => void }) {
  const u = (patch: Partial<Subgroup>) => onUpdate({ ...sg, ...patch });

  return (
    <View className="bg-[#111111] border border-neutral-800 rounded-3xl p-5 mb-6">
      {/* Header */}
      <Text className="text-white font-bold text-lg text-right mb-5">
        תת-קבוצה {index + 1}
      </Text>

      {/* שם */}
      <View className="mb-5">
        <Text className="text-neutral-400 text-sm mb-2 text-right">שם:</Text>
        <TextInput
          className="bg-[#0a0a0a] border border-neutral-800 rounded-xl h-12 px-4 text-white text-right"
          placeholder="לדוגמה: ריצ׳י תל-אביב"
          placeholderTextColor="#52525b"
          value={sg.name}
          onChangeText={(v) => u({ name: v })}
        />
      </View>

      {/* ענף */}
      <View className="mb-5">
        <Text className="text-neutral-400 text-sm mb-2 text-right">ענף:</Text>
        <SportDropdown value={sg.sport} onChange={(v) => u({ sport: v })} />
      </View>

      {/* רמה */}
      <View className="mb-5">
        <Text className="text-neutral-400 text-sm mb-3 text-right">רמה:</Text>
        <View className="flex-row justify-end" style={{ gap: 8 }}>
          {LEVELS.map((lvl) => {
            const active = sg.level === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                onPress={() => u({ level: lvl })}
                style={{
                  backgroundColor: active ? 'rgba(34,197,94,0.15)' : 'transparent',
                  borderColor: active ? '#22c55e' : '#404040',
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ color: active ? '#22c55e' : '#71717a', fontWeight: active ? '700' : '400' }}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* מטרה */}
      <View className="mb-6">
        <Text className="text-neutral-400 text-sm mb-2 text-right">מטרה:</Text>
        <TextInput
          className="bg-[#0a0a0a] border border-neutral-800 rounded-xl h-12 px-4 text-white text-right"
          placeholder="לדוגמה: הכנה לתחרות ירושלים"
          placeholderTextColor="#52525b"
          value={sg.goal}
          onChangeText={(v) => u({ goal: v })}
        />
      </View>

      {/* ימי אימון וסוג */}
      <DayScheduleMatrix
        schedule={sg.schedule}
        onChange={(s) => u({ schedule: s })}
      />
    </View>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepBar() {
  const steps = [
    { label: 'קבוצות', num: 1, active: true },
    { label: 'תאריכים', num: 2 },
    { label: 'תשלום', num: 3 },
    { label: 'תוכנית AI', num: 4 },
  ];
  return (
    <View className="flex-row items-center justify-center mb-8" style={{ direction: 'rtl', gap: 0 }}>
      {steps.map((s, i) => (
        <View key={s.num} className="flex-row items-center">
          <View
            style={{
              backgroundColor: s.active ? 'rgba(34,197,94,0.15)' : 'transparent',
              borderWidth: 1,
              borderColor: s.active ? '#22c55e' : '#404040',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {s.active && (
              <View className="w-4 h-4 rounded-full bg-[#22c55e] items-center justify-center">
                <Text style={{ color: '#09090b', fontSize: 9, fontWeight: '900' }}>{s.num}</Text>
              </View>
            )}
            <Text style={{ color: s.active ? '#22c55e' : '#6b7280', fontSize: 12, fontWeight: s.active ? '700' : '400' }}>
              {s.label}
            </Text>
          </View>
          {i < steps.length - 1 && (
            <Text style={{ color: '#404040', marginHorizontal: 4, fontSize: 12 }}>{'<'}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SubgroupsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([makeNewSubgroup(1)]);

  const updateSubgroup = (index: number, sg: Subgroup) => {
    const next = [...subgroups];
    next[index] = sg;
    setSubgroups(next);
  };

  const addSubgroup = () => {
    if (subgroups.length >= 5) return;
    setSubgroups([...subgroups, makeNewSubgroup(Date.now())]);
  };

  const handleNext = async () => {
    const empty = subgroups.find(sg => !sg.name.trim());
    if (empty) {
      Alert.alert('שגיאה', 'יש להזין שם לכל תתי הקבוצות');
      return;
    }

    setLoading(true);

    // ── Step 1: Verify session is still alive ─────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      Alert.alert(
        'פג תוקף ההתחברות',
        'נא להתחבר מחדש ולחזור לשלב זה.',
        [{ text: 'חזרה להתחברות', onPress: () => router.replace('/(auth)/login') }]
      );
      return;
    }

    console.log('[Subgroups] Fetching group for user.id:', user.id);

    // ── Step 2: Small delay to let the DB trigger finish propagating ──────────
    await new Promise(res => setTimeout(res, 500));

    // ── Step 3: Fetch group with maybeSingle (never throws on 0 rows) ─────────
    let { data: groupRow, error: groupFetchError } = await supabase
      .from('groups')
      .select('id')
      .eq('head_coach_id', user.id)
      .maybeSingle();

    if (groupFetchError) {
      console.error('[Subgroups] Group fetch error:', JSON.stringify(groupFetchError, null, 2));
    }

    // ── Step 4: Graceful fallback — create the group if trigger didn't ────────
    if (!groupRow) {
      console.warn('[Subgroups] Group not found (trigger may have failed). Creating fallback group for user.id:', user.id);

      const { data: newGroup, error: createError } = await supabase
        .from('groups')
        .insert({ head_coach_id: user.id, name: 'מועדון חדש' })
        .select('id')
        .single();

      if (createError || !newGroup) {
        console.error('[Subgroups] Fallback group creation failed:', JSON.stringify(createError, null, 2));
        setLoading(false);
        Alert.alert(
          'שגיאה ביצירת מועדון',
          `לא הצלחנו ליצור את המועדון.\n\n(${createError?.message ?? 'Unknown error'})\n\nנסה להתנתק ולהירשם מחדש.`,
          [
            { text: 'נסה שוב', onPress: handleNext },
            { text: 'התנתקות', onPress: async () => { await supabase.auth.signOut(); router.replace('/(auth)/login'); }, style: 'destructive' }
          ]
        );
        return;
      }

      groupRow = newGroup;
      console.log('[Subgroups] Fallback group created with id:', groupRow.id);
    } else {
      console.log('[Subgroups] Found group_id:', groupRow.id);
    }

    // ── Step 3: Insert all subgroups ──────────────────────────────────────────
    const inserts = subgroups.map((sg) => ({
      group_id: groupRow!.id,
      name: sg.name.trim(),
      description: JSON.stringify({
        sport: sg.sport,
        level: sg.level,
        goal: sg.goal,
        schedule: sg.schedule,
      }),
    }));

    const { error: insertError } = await supabase.from('subgroups').insert(inserts);

    if (insertError) {
      console.error('[Subgroups] Insert error:', JSON.stringify(insertError, null, 2));
      setLoading(false);
      Alert.alert('שגיאה בשמירה', `לא הצלחנו לשמור את הקבוצות:\n${insertError.message}`);
      return;
    }

    console.log('[Subgroups] Successfully inserted subgroups. Navigating to ai-plan.');
    setLoading(false);
    router.push('/(auth)/coach-onboarding/ai-plan' as any);
  };

  const canAdd = subgroups.length < 5;

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StepBar />

          <Text className="text-white text-3xl font-black text-center mb-2">הקמת תתי קבוצות</Text>
          <Text className="text-neutral-500 text-center mb-8">
            הגדר את הקבוצות שלך - עד 5 תתי קבוצות
          </Text>

          {subgroups.map((sg, i) => (
            <SubgroupCard
              key={sg.id}
              sg={sg}
              index={i}
              onUpdate={(updated) => updateSubgroup(i, updated)}
            />
          ))}

          {/* Add subgroup button */}
          <TouchableOpacity
            onPress={addSubgroup}
            disabled={!canAdd}
            className={`border rounded-2xl h-14 items-center justify-center flex-row mb-8 ${canAdd ? 'border-neutral-700 border-dashed' : 'border-neutral-800'}`}
            style={{ gap: 8 }}
          >
            <Plus color={canAdd ? '#9ca3af' : '#404040'} size={18} />
            <Text style={{ color: canAdd ? '#9ca3af' : '#404040', fontWeight: '500' }}>
              הוסף תת-קבוצה ({subgroups.length}/5)
            </Text>
          </TouchableOpacity>

          {/* Next button */}
          <TouchableOpacity
            onPress={handleNext}
            disabled={loading || subgroups.some(sg => !sg.name.trim())}
            className={`rounded-2xl h-16 items-center justify-center flex-row ${subgroups.some(sg => !sg.name.trim()) ? 'bg-neutral-800' : 'bg-[#22c55e]'}`}
            style={{ gap: 8 }}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#09090b" />
              : (
                <>
                  <Text className={`font-bold text-lg ${subgroups.some(sg => !sg.name.trim()) ? 'text-neutral-600' : 'text-neutral-950'}`}>
                    המשך לבחירת תאריכים
                  </Text>
                  <ChevronLeft color={subgroups.some(sg => !sg.name.trim()) ? '#525252' : '#09090b'} size={22} />
                </>
              )
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
