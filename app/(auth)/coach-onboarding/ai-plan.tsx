import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { generateWorkoutPlan } from '../../../lib/ai-service';
import { Sparkles, CalendarDays, FileText, Save, Gift, RefreshCw, ChevronLeft } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AIWorkout {
  title: string;
  description: string;
  date: string;           // YYYY-MM-DD
  type: 'swim' | 'bike' | 'run' | 'strength';
  subgroup_name: string;
}

interface Subgroup {
  id: string;
  name: string;
  description: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  swim:     { label: 'שחייה',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  bike:     { label: 'אופניים', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  run:      { label: 'ריצה',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  strength: { label: 'כוח',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

const fmt = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function monthStart() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}
function monthEnd() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999); return d;
}

// ─── Step Bar ─────────────────────────────────────────────────────────────────
function StepBar() {
  const steps = [
    { label: 'קבוצות', num: 1 },
    { label: 'תאריכים', num: 2 },
    { label: 'תשלום', num: 3 },
    { label: 'תוכנית AI', num: 4, active: true },
  ];
  return (
    <View className="flex-row items-center justify-center mb-6">
      {steps.map((s, i) => (
        <View key={s.num} className="flex-row items-center">
          <View style={{
            backgroundColor: s.active ? 'rgba(34,197,94,0.15)' : 'transparent',
            borderWidth: 1, borderColor: s.active ? '#22c55e' : '#404040',
            borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
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

// ─── Free Trial Banner ────────────────────────────────────────────────────────
function FreeBanner() {
  return (
    <View style={{
      backgroundColor: 'rgba(251,191,36,0.08)', borderWidth: 1,
      borderColor: 'rgba(251,191,36,0.3)', borderRadius: 16,
      padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <Gift color="#fbbf24" size={20} />
      <Text style={{ color: '#fbbf24', fontSize: 13, flex: 1, lineHeight: 20, textAlign: 'right' }}>
        <Text style={{ fontWeight: '700' }}>🎁 תקופת הרצה חינמית:</Text>
        {' '}המערכת פתוחה לשימוש חינמי לזמן מוגבל כדי שתוכלו לחוות את מלוא היכולות שלנו.
      </Text>
    </View>
  );
}

// ─── Date Selector ────────────────────────────────────────────────────────────
function DateSelector({ label, value, onChange, minimumDate, maximumDate }: {
  label: string; value: Date; onChange: (d: Date) => void;
  minimumDate?: Date; maximumDate?: Date;
}) {
  const [show, setShow] = useState(false);

  const onPickerChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShow(Platform.OS === 'ios'); // iOS keeps open; Android closes
    if (selected) onChange(selected);
  };

  return (
    <View className="flex-1">
      <Text className="text-neutral-400 text-xs mb-2 text-right font-medium">{label}</Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="flex-row items-center bg-[#111111] rounded-xl px-4 h-14 border border-neutral-800"
      >
        <CalendarDays color="#22c55e" size={16} />
        <Text className="flex-1 text-white text-right text-base ml-2">{fmt(value)}</Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
          minimumDate={minimumDate ?? new Date()}
          maximumDate={maximumDate}
          themeVariant="dark"
        />
      )}
    </View>
  );
}

// ─── Workout Preview Card ─────────────────────────────────────────────────────
function WorkoutCard({ workout }: { workout: AIWorkout }) {
  const meta = TYPE_META[workout.type] ?? TYPE_META.run;
  const [y, m, d] = workout.date.split('-');
  const displayDate = `${d}.${m}.${y}`;

  return (
    <View style={{
      backgroundColor: '#111111', borderWidth: 1, borderColor: '#262626',
      borderRadius: 16, padding: 14, marginBottom: 10,
    }}>
      <View className="flex-row items-center justify-between mb-2">
        <View style={{
          backgroundColor: meta.bg, borderWidth: 1, borderColor: meta.color,
          borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
        }}>
          <Text style={{ color: meta.color, fontSize: 11, fontWeight: '700' }}>{meta.label}</Text>
        </View>
        <Text style={{ color: '#6b7280', fontSize: 12 }}>{displayDate}</Text>
      </View>
      <Text className="text-white font-bold text-base text-right mb-1">{workout.title}</Text>
      <View className="flex-row justify-end mb-2">
        <View className="bg-neutral-800 rounded-full px-3 py-1">
          <Text className="text-neutral-400 text-xs">{workout.subgroup_name}</Text>
        </View>
      </View>
      <Text style={{ color: '#9ca3af', fontSize: 13, textAlign: 'right', lineHeight: 20 }}>
        {workout.description}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AIPlanScreen() {
  const router = useRouter();

  const [startDate, setStartDate] = useState<Date>(monthStart());
  const [endDate, setEndDate]     = useState<Date>(monthEnd());
  const [notes, setNotes]         = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(true);
  const [subgroupsData, setSubgroupsData] = useState<Subgroup[]>([]);
  const [coachId, setCoachId]   = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<AIWorkout[]>([]);
  const [parseError, setParseError] = useState(false);

  // ── Fetch coach's subgroups on mount ────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFetchingGroups(false); return; }
      setCoachId(user.id);

      const { data: groupRow } = await supabase
        .from('groups').select('id').eq('head_coach_id', user.id).maybeSingle();
      if (groupRow) {
        const { data: sgs } = await supabase
          .from('subgroups').select('id, name, description').eq('group_id', groupRow.id);
        if (sgs) setSubgroupsData(sgs as Subgroup[]);
      }
      setFetchingGroups(false);
    })();
  }, []);

  // ── Validate date range (max 45 days) ───────────────────────────────────
  const validateDates = (): boolean => {
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
    if (endDate <= startDate) {
      Alert.alert('שגיאה', 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה'); return false;
    }
    if (diffDays > 45) {
      Alert.alert('שגיאה', 'הפרש התאריכים לא יכול לעלות על 45 יום'); return false;
    }
    return true;
  };

  // ── Computed date constraints ────────────────────────────────────────────
  const maxEndDate = new Date(startDate.getTime() + 45 * 86400000);
  const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
  const isLongRange = diffDays > 30;

  // ── Build AI prompt ─────────────────────────────────────────────────────
  const buildPrompt = (strict = false) => {
    const subgroupNames = subgroupsData.map(sg => sg.name).join(', ');
    const subgroupDetails = subgroupsData.map(sg => {
      try { return { name: sg.name, ...JSON.parse(sg.description) }; }
      catch { return { name: sg.name }; }
    });
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
    const totalWorkouts = totalDays * subgroupsData.length;

    return `You are a professional triathlon coach AI.
Create a structured training plan from ${toISO(startDate)} to ${toISO(endDate)}.
${notes ? `Coach notes: ${notes}` : ''}

Club subgroups: ${JSON.stringify(subgroupDetails)}
Subgroup names you MUST use exactly: [${subgroupNames}]

${strict ? 'CRITICAL: Your previous response was not valid JSON. This time you MUST return only valid JSON. ' : ''}

COVERAGE RULES (MANDATORY):
- The date range spans ${totalDays} days, and there are ${subgroupsData.length} subgroup(s).
- You MUST generate a workout for EVERY SINGLE DAY within the date range for EACH subgroup.
- Total expected workout objects: exactly ${totalWorkouts}.
- Do NOT summarize or skip any days. Every day from ${toISO(startDate)} to ${toISO(endDate)} must have a dedicated entry per subgroup.
- REST DAYS ("יום מנוחה") are valid workouts. Generate them with type "strength", a title like "יום מנוחה פעילה" or "יום התאוששות", and a description with recovery instructions.
- Apply proper periodization: vary intensity across the week, include progressive overload, and balance workout types.
- If the coach's notes specify fewer training days per week, fill the remaining days with active recovery workouts.

Return ONLY a valid JSON array. No markdown, no explanation, no code fences.
Each object must have EXACTLY these fields:
- "title": short Hebrew workout name (string)
- "description": Hebrew description with distance/duration targets (string)
- "date": ISO date "YYYY-MM-DD" within the given range (string)
- "type": exactly one of: "swim", "bike", "run", "strength" (string)
- "subgroup_name": must exactly match one of: [${subgroupNames}] (string)

Start your response with [ and end with ]`;
  };

  // ── Parse AI JSON safely ─────────────────────────────────────────────────
  const parseWorkouts = (raw: string): AIWorkout[] | null => {
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      const first = parsed[0];
      if (!first.title || !first.date || !first.type || !first.subgroup_name) return null;
      return parsed as AIWorkout[];
    } catch { return null; }
  };

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = async (strict = false) => {
    if (!validateDates()) return;
    setGenerating(true);
    setWorkouts([]);
    setParseError(false);

    try {
      const raw = await generateWorkoutPlan(buildPrompt(strict));

      // ── Check for guardrail rejection ──────────────────────────────
      try {
        const maybeError = JSON.parse(raw.replace(/```json|```/g, '').trim());
        if (maybeError && !Array.isArray(maybeError) && maybeError.error) {
          Alert.alert('נושא מחוץ לתחום', maybeError.error);
          return;          // keep workouts empty → Save button stays hidden
        }
      } catch {
        // Not a rejection object — continue to normal parsing below
      }

      const parsed = parseWorkouts(raw);
      if (!parsed) {
        setParseError(true);
        Alert.alert('תגובת AI לא תקינה', 'ה-AI לא החזיר JSON תקין. לחץ "נסה שוב" לשליחה מחמירה יותר.');
      } else {
        setWorkouts(parsed);
      }
    } catch (err: any) {
      Alert.alert('שגיאה', err?.message ?? 'לא הצלחנו לייצר תוכנית. נסה שוב.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Save workouts to DB ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!coachId) { Alert.alert('שגיאה', 'נתוני מאמן חסרים.'); return; }
    setSaving(true);

    const subgroupMap: Record<string, string> = {};
    subgroupsData.forEach(sg => { subgroupMap[sg.name] = sg.id; });
    const fallbackSubgroupId = subgroupsData[0]?.id ?? null;

    // Only include columns that exist in the workouts table schema
    const inserts = workouts.map(w => ({
      subgroup_id: subgroupMap[w.subgroup_name] ?? fallbackSubgroupId,
      title: w.title,
      description: w.description,
      date: w.date,
      type: w.type,
      coach_id: coachId,
    }));

    const { error } = await supabase.from('workouts').insert(inserts);

    if (error) {
      console.error('[AI Plan] Insert error:', JSON.stringify(error, null, 2));
      setSaving(false);
      Alert.alert('שגיאה בשמירה', `לא הצלחנו לשמור אימונים:\n${error.message}`);
      return;
    }

    setSaving(false);
    router.replace('/(tabs)');
  };

  const canGenerate = !generating && !fetchingGroups;
  const hasPlan = workouts.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StepBar />
          <FreeBanner />

          {/* Header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/30 items-center justify-center mb-4">
              <Sparkles color="#22c55e" size={30} />
            </View>
            <Text className="text-white text-3xl font-black text-center mb-2">תוכנית אימון AI</Text>
            <Text className="text-neutral-500 text-center text-sm px-6">
              הגדר טווח תאריכים וה-AI יבנה תוכנית אימון מותאמת לקבוצות שלך
            </Text>
          </View>

          {/* Subgroups preview */}
          {!fetchingGroups && subgroupsData.length > 0 && (
            <View className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 mb-6">
              <Text className="text-neutral-500 text-xs font-bold mb-3 text-right">קבוצות שנטענו:</Text>
              <View className="flex-row flex-wrap justify-end" style={{ gap: 8 }}>
                {subgroupsData.map((sg, i) => (
                  <View key={i} className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-full px-3 py-1">
                    <Text className="text-[#22c55e] text-xs font-bold">{sg.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Date Pickers */}
          <View className="mb-6">
            <Text className="text-white font-bold text-right mb-3 text-base">טווח תאריכים</Text>
            <View className="flex-row" style={{ gap: 12 }}>
              <DateSelector label="תאריך סיום" value={endDate} onChange={setEndDate} minimumDate={startDate} maximumDate={maxEndDate} />
              <DateSelector label="תאריך התחלה" value={startDate} onChange={setStartDate} />
            </View>
            <Text className="text-neutral-600 text-xs text-right mt-2">* מקסימום 45 יום</Text>
            {isLongRange && (
              <Text style={{ color: '#f97316', fontSize: 12, textAlign: 'right', marginTop: 4 }}>
                ⚠️ טווח ארוך ({diffDays} ימים) — זמן הייצור עשוי להיות ארוך יותר
              </Text>
            )}
          </View>

          {/* Coach Notes */}
          <View className="mb-6">
            <Text className="text-white font-bold text-right mb-3 text-base">הערות ל-AI</Text>
            <View className="bg-[#111111] border border-neutral-800 rounded-2xl p-4">
              <TextInput
                className="text-white text-right text-sm"
                placeholder="הערות ל-AI (למשל: התמקד בטכניקת שחייה בשבועיים הראשונים...)"
                placeholderTextColor="#3f3f46"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{ minHeight: 90, lineHeight: 22 }}
              />
              <View className="flex-row justify-start mt-2">
                <FileText color="#3f3f46" size={14} />
              </View>
            </View>
          </View>

          {/* Generate */}
          <TouchableOpacity
            onPress={() => handleGenerate(false)}
            disabled={!canGenerate}
            className={`rounded-2xl h-16 items-center justify-center flex-row mb-4 ${canGenerate ? 'bg-[#22c55e]' : 'bg-neutral-800'}`}
            style={{ gap: 10 }}
            activeOpacity={0.85}
          >
            {generating ? (
              <>
                <ActivityIndicator color="#09090b" />
                <Text className="text-neutral-950 font-bold text-base">מייצר תוכנית...</Text>
              </>
            ) : (
              <>
                <Sparkles color={canGenerate ? '#09090b' : '#525252'} size={22} />
                <Text className={`font-bold text-lg ${canGenerate ? 'text-neutral-950' : 'text-neutral-600'}`}>
                  ייצר תוכנית אימון עם AI
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Retry on parse error */}
          {parseError && (
            <TouchableOpacity
              onPress={() => handleGenerate(true)}
              disabled={generating}
              className="rounded-2xl h-12 items-center justify-center flex-row border border-orange-600 mb-6"
              style={{ gap: 8 }}
            >
              <RefreshCw color="#ea580c" size={18} />
              <Text className="text-orange-500 font-bold">נסה שוב עם פרומפט מחמיר</Text>
            </TouchableOpacity>
          )}

          {/* Workout Preview */}
          {hasPlan && (
            <>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-neutral-500 text-sm">{workouts.length} אימונים</Text>
                <Text className="text-white font-bold text-base">תצוגה מקדימה</Text>
              </View>

              {workouts.map((w, i) => <WorkoutCard key={i} workout={w} />)}

              {/* Save — disabled until plan exists */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !hasPlan}
                className={`rounded-2xl h-16 items-center justify-center flex-row mt-4 mb-4 ${hasPlan ? 'bg-white' : 'bg-neutral-800'}`}
                style={{ gap: 10 }}
                activeOpacity={0.85}
              >
                {saving ? (
                  <>
                    <ActivityIndicator color="#09090b" />
                    <Text className="text-neutral-900 font-bold text-lg">שומר...</Text>
                  </>
                ) : (
                  <>
                    <Save color={hasPlan ? '#09090b' : '#525252'} size={22} />
                    <Text className={`font-bold text-lg ${hasPlan ? 'text-neutral-900' : 'text-neutral-600'}`}>
                      שמור אימונים ועבור לדשבורד
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Skip */}
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            className="rounded-2xl h-12 items-center justify-center border border-neutral-800 flex-row"
            style={{ gap: 8 }}
          >
            <ChevronLeft color="#6b7280" size={18} />
            <Text className="text-neutral-500 font-medium text-sm">דלג וכנס לדשבורד</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
