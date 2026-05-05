import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, ScrollView, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Alert, Modal, TextInput 
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { api as supabase } from '../../lib/api';
import { Trophy, Plus, ChevronRight, X, Timer, MapPin, Activity } from 'lucide-react-native';
import { useLanguage } from '../../lib/LanguageContext';

interface Benchmark {
  id: string;
  name: string;
  distance: number;
  unit: string;
  discipline: string;
  subgroup_id: string;
}

export default function BenchmarksScreen() {
  const { subgroup_id } = useLocalSearchParams<{ subgroup_id: string }>();
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newBenchmark, setNewBenchmark] = useState({
    name: '',
    distance: '',
    unit: 'meters',
    discipline: 'run'
  });
  const [creating, setCreating] = useState(false);

  const fetchBenchmarks = useCallback(async () => {
    try {
      if (!subgroup_id) return;
      const { data, error } = await supabase
        .from('benchmarks')
        .select('*')
        .eq('subgroup_id', subgroup_id);
      
      if (error) throw error;
      setBenchmarks(data || []);
    } catch (err) {
      console.error('[Benchmarks] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subgroup_id]);

  useEffect(() => {
    fetchBenchmarks();
  }, [fetchBenchmarks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBenchmarks();
  };

  const handleCreateBenchmark = async () => {
    if (!newBenchmark.name.trim() || !newBenchmark.distance) return;
    setCreating(true);
    try {
      await supabase.from('benchmarks').insert({
        subgroup_id,
        name: newBenchmark.name.trim(),
        distance: parseFloat(newBenchmark.distance),
        unit: newBenchmark.unit,
        discipline: newBenchmark.discipline
      });
      setCreateModalVisible(false);
      setNewBenchmark({ name: '', distance: '', unit: 'meters', discipline: 'run' });
      fetchBenchmarks();
    } catch (e) {
      Alert.alert(t('שגיאה', 'Error'), t('יצירת המדד נכשלה', 'Failed to create benchmark'));
    } finally {
      setCreating(false);
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
      <Stack.Screen options={{ title: t('מדדי קבוצה', 'Group Benchmarks') }} />
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
      >
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity 
            onPress={() => setCreateModalVisible(true)}
            className="w-12 h-12 rounded-2xl bg-[#22c55e] items-center justify-center shadow-lg shadow-[#22c55e]/20"
          >
            <Plus color="#ffffff" size={24} />
          </TouchableOpacity>
          <View className="flex-row items-center gap-3">
            <Text className="text-white text-2xl font-bold">{t('מדדים', 'Benchmarks')}</Text>
            <View className="w-10 h-10 rounded-xl bg-purple-500/10 items-center justify-center">
              <Trophy color="#a855f7" size={24} />
            </View>
          </View>
        </View>

        {benchmarks.length === 0 ? (
          <View className="bg-[#111111] border border-neutral-800 rounded-3xl p-12 items-center">
            <Activity color="#525252" size={48} />
            <Text className="text-neutral-500 text-center mt-4 font-medium">
              {t('אין מדדים מוגדרים לקבוצה זו.', 'No benchmarks defined for this group.')}
            </Text>
            <TouchableOpacity 
              onPress={() => setCreateModalVisible(true)}
              className="mt-6 bg-[#22c55e]/10 px-6 py-3 rounded-2xl border border-[#22c55e]/20"
            >
              <Text className="text-[#22c55e] font-bold">{t('צור את המדד הראשון', 'Create First Benchmark')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          benchmarks.map(bm => (
            <TouchableOpacity 
              key={bm.id}
              activeOpacity={0.7}
              className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 mb-4 flex-row items-center justify-between"
            >
              <ChevronRight color="#52525b" size={20} />
              
              <View className="items-end">
                <Text className="text-white font-bold text-lg mb-1">{bm.name}</Text>
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1">
                    <Text className="text-neutral-500 text-xs">{bm.distance} {bm.unit}</Text>
                    <MapPin color="#737373" size={12} />
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-neutral-500 text-xs capitalize">{bm.discipline}</Text>
                    <Activity color="#737373" size={12} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111111] rounded-t-[32px] p-6 border-t border-neutral-800">
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} className="p-2">
                <X color="#52525b" size={24} />
              </TouchableOpacity>
              <Text className="text-white text-xl font-bold">{t('יצירת מדד חדש', 'Create Benchmark')}</Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-neutral-400 text-right mb-2 text-sm">{t('שם המדד', 'Name')}</Text>
                <TextInput
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-right"
                  placeholder={t('לדוגמה: מבחן 5 ק״מ', 'e.g. 5km Time Trial')}
                  placeholderTextColor="#52525b"
                  value={newBenchmark.name}
                  onChangeText={v => setNewBenchmark(prev => ({ ...prev, name: v }))}
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-neutral-400 text-right mb-2 text-sm">{t('יחידות', 'Unit')}</Text>
                  <TextInput
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-right"
                    placeholder={t('מטר / ק״מ', 'meters / km')}
                    placeholderTextColor="#52525b"
                    value={newBenchmark.unit}
                    onChangeText={v => setNewBenchmark(prev => ({ ...prev, unit: v }))}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-neutral-400 text-right mb-2 text-sm">{t('מרחק', 'Distance')}</Text>
                  <TextInput
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-right"
                    placeholder="0"
                    placeholderTextColor="#52525b"
                    keyboardType="numeric"
                    value={newBenchmark.distance}
                    onChangeText={v => setNewBenchmark(prev => ({ ...prev, distance: v }))}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCreateBenchmark}
                disabled={creating || !newBenchmark.name.trim()}
                className={`bg-[#22c55e] rounded-2xl p-4 items-center mt-6 ${creating ? 'opacity-50' : ''}`}
              >
                {creating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-lg">{t('צור מדד', 'Create Benchmark')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
