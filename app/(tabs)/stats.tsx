import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { BarChart3, Users, Calendar, Award, FileText, X, Sparkles } from 'lucide-react-native';
import { api as supabase } from '../../lib/api';
import { useLanguage } from '../../lib/LanguageContext';

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalAthletes: 0,
    upcomingWorkouts: 0,
    subgroupsCount: 0,
    subgroupIds: [] as string[],
  });

  const { t, language } = useLanguage();

  // Report State
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [reportSubgroupId, setReportSubgroupId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get subgroups
      const { data: group } = await supabase
        .from('groups')
        .select('id')
        .eq('head_coach_id', user.id)
        .maybeSingle();

      if (!group) return;

      const { data: sgs } = await supabase
        .from('subgroups')
        .select('id')
        .eq('group_id', group.id);
      
      const sgroupIds = (sgs || []).map((s: any) => s.id);

      // 2. Get athletes count
      const { data: members } = await supabase
        .from('group_members')
        .select('athlete_id')
        .in('subgroup_id', sgroupIds);
      
      const uniqueAthletes = new Set((members || []).map((m: any) => m.athlete_id));

      // 3. Get upcoming workouts
      const today = new Date().toISOString().split('T')[0];
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id')
        .in('subgroup_id', sgroupIds)
        .gte('date', today);

      setStats({
        totalAthletes: uniqueAthletes.size,
        upcomingWorkouts: workouts?.length || 0,
        subgroupsCount: sgroupIds.length,
        subgroupIds: sgroupIds,
      });

      if (sgroupIds.length > 0 && !reportSubgroupId) {
        setReportSubgroupId(sgroupIds[0]);
      }
    } catch (err) {
      console.error('[Stats] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  const generateReport = async () => {
    if (stats.subgroupIds.length === 0) return;
    setLoadingReport(true);
    setReportModalVisible(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('weekly-report', {
        body: {
          coachId: user?.id,
          subgroupId: reportSubgroupId || stats.subgroupIds[0],
          language: language === 'he' ? 'he' : 'en'
        }
      });
      if (error) throw error;
      setReportContent(data.report);
    } catch (err) {
      console.error('[Report] Error:', err);
      setReportContent('נכשלה טעינת הדוח. נסה שוב מאוחר יותר.');
    } finally {
      setLoadingReport(false);
    }
  };

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
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
      >
        <View className="flex-row items-center justify-end gap-3 mb-8">
          <Text className="text-white text-2xl font-bold">סטטיסטיקה</Text>
          <View className="w-10 h-10 rounded-xl bg-[#22c55e]/10 items-center justify-center">
            <BarChart3 color="#22c55e" size={24} />
          </View>
        </View>

        <View className="flex-row flex-wrap gap-4 justify-between mb-8">
          <StatCard title={t('סה״כ מתאמנים', 'Total Athletes')} value={stats.totalAthletes} icon={<Users color="#3b82f6" size={20} />} color="bg-blue-500/10" textColor="text-blue-500" />
          <StatCard title={t('אימונים קרובים', 'Upcoming Workouts')} value={stats.upcomingWorkouts} icon={<Calendar color="#22c55e" size={20} />} color="bg-green-500/10" textColor="text-green-500" />
          <StatCard title={t('תתי-קבוצות', 'Subgroups')} value={stats.subgroupsCount} icon={<Award color="#a855f7" size={20} />} color="bg-purple-500/10" textColor="text-purple-500" />
        </View>

        {/* Weekly Report Button */}
        <TouchableOpacity
          onPress={generateReport}
          className="bg-[#111111] border border-neutral-800 rounded-3xl p-6 flex-row items-center justify-between"
        >
          <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
            <Sparkles color="#3b82f6" size={20} />
          </View>
          <View className="items-end flex-1 mr-4">
            <Text className="text-white font-bold text-lg">{t('דוח שבועי חכם', 'Weekly AI Report')}</Text>
            <Text className="text-neutral-500 text-sm">{t('סיכום פעילות הקבוצה עם AI', 'Group activity summary via AI')}</Text>
          </View>
          <FileText color="#52525b" size={24} />
        </TouchableOpacity>

        {stats.subgroupIds.length > 1 && (
          <View className="mt-4 flex-row justify-end gap-2 px-2">
            <Text className="text-neutral-500 text-xs italic">{t('מייצר דוח עבור תת-הקבוצה הראשונה', 'Generating report for the primary subgroup')}</Text>
          </View>
        )}

        <View className="mt-10 bg-[#111111] border border-neutral-800 rounded-3xl p-6 items-center">
          <Text className="text-neutral-400 text-center text-sm leading-6">
            נתוני הביצועים והגרפים המפורטים נמצאים כרגע בתהליך פיתוח ויוצגו כאן בקרוב.
          </Text>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111111] rounded-t-[32px] p-6 border-t border-neutral-800 h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity onPress={() => setReportModalVisible(false)} className="p-2">
                <X color="#52525b" size={24} />
              </TouchableOpacity>
              <Text className="text-white text-xl font-bold">דוח פעילות שבועי</Text>
            </View>

            <ScrollView className="flex-1">
              {loadingReport ? (
                <View className="py-20 items-center">
                  <ActivityIndicator color="#22c55e" size="large" />
                  <Text className="text-neutral-500 mt-4">מייצר דוח חכם...</Text>
                </View>
              ) : (
                <View className="bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800">
                  <Text className="text-white text-right leading-7 text-base">
                    {reportContent}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setReportModalVisible(false)}
              className="bg-neutral-800 rounded-2xl p-4 items-center mt-6"
            >
              <Text className="text-white font-bold">סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ title, value, icon, color, textColor }: { title: string, value: number | string, icon: React.ReactNode, color: string, textColor: string }) {
  return (
    <View className={`w-[47%] ${color} border border-white/5 rounded-3xl p-5`}>
      <View className="mb-4">{icon}</View>
      <Text className="text-neutral-400 text-xs mb-1 text-right">{title}</Text>
      <Text className={`text-2xl font-black text-right ${textColor}`}>{value}</Text>
    </View>
  );
}

