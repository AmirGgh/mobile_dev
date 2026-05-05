import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, ScrollView, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Alert, Modal, TextInput 
} from 'react-native';
import { 
  Wallet, TrendingUp, TrendingDown, Users, 
  Plus, CreditCard, DollarSign, ChevronRight,
  X
} from 'lucide-react-native';
import { api as supabase } from '../../lib/api';
import { useLanguage } from '../../lib/LanguageContext';

interface AthleteSubscription {
  id: string;
  athlete_id: string;
  club_id: string;
  monthly_fee: number;
  balance: number | null;
  billing_day_of_month: number | null;
  is_active: boolean | null;
  full_name?: string;
  email?: string;
}

export default function FinanceScreen() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<AthleteSubscription[]>([]);
  const [totalMonthlyRevenue, setTotalMonthlyRevenue] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);

  // Add Payment Modal State
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [paymentAthleteId, setPaymentAthleteId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchFinanceData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: group } = await supabase
        .from('groups')
        .select('id')
        .eq('head_coach_id', user.id)
        .maybeSingle();

      if (!group) {
        setLoading(false);
        return;
      }

      const { data: subs, error: subsError } = await supabase
        .from('athlete_subscriptions')
        .select('*')
        .eq('club_id', group.id);

      if (subsError) throw subsError;

      const subList = (subs || []) as AthleteSubscription[];
      const athleteIds = subList.map(s => s.athlete_id);
      
      if (athleteIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', athleteIds);
        
        const profileMap: Record<string, any> = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });

        subList.forEach(s => {
          s.full_name = profileMap[s.athlete_id]?.full_name;
          s.email = profileMap[s.athlete_id]?.email;
        });
      }

      setSubscriptions(subList);
      const revenue = subList.filter(s => s.is_active).reduce((sum, s) => sum + Number(s.monthly_fee), 0);
      const debt = subList.reduce((sum, s) => sum + Number(s.balance ?? 0), 0);
      
      setTotalMonthlyRevenue(revenue);
      setTotalDebt(debt);

    } catch (err) {
      console.error('[Finance] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFinanceData(); }, [fetchFinanceData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFinanceData();
  };

  const handleChargeAll = async () => {
    Alert.alert(
      t('חיוב חודשי חכם', 'Smart Collection'),
      t('האם אתה בטוח שברצונך לחייב את כל המנויים הפעילים בעלות החודשית שלהם?', 'Are you sure you want to charge all active subscriptions their monthly fee?'),
      [
        { text: t('ביטול', 'Cancel'), style: 'cancel' },
        { 
          text: t('חייב הכל', 'Charge All'), 
          onPress: async () => {
            setLoading(true);
            try {
              const activeSubs = subscriptions.filter(s => s.is_active && s.monthly_fee > 0);
              for (const sub of activeSubs) {
                const newBalance = Number(sub.balance ?? 0) + Number(sub.monthly_fee);
                await supabase.from('athlete_subscriptions').update({ balance: newBalance }).eq('id', sub.id);
              }
              Alert.alert(t('הצלחה', 'Success'), t('כל המנויים חויבו בהצלחה', 'All subscriptions charged successfully'));
              fetchFinanceData();
            } catch (e) {
              Alert.alert(t('שגיאה', 'Error'), t('שגיאה בחיוב המנויים', 'Error charging subscriptions'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAddPayment = async () => {
    if (!paymentAthleteId || !paymentAmount) return;
    setSavingPayment(true);
    try {
      const amount = parseFloat(paymentAmount);
      const sub = subscriptions.find(s => s.athlete_id === paymentAthleteId);
      if (!sub) return;

      const newBalance = Math.max(0, Number(sub.balance ?? 0) - amount);
      
      const { error } = await supabase
        .from('athlete_subscriptions')
        .update({ balance: newBalance })
        .eq('id', sub.id);

      if (error) throw error;

      Alert.alert(t('הצלחה', 'Success'), t('התשלום נקלט בהצלחה', 'Payment recorded successfully'));
      setPayModalVisible(false);
      setPaymentAmount('');
      fetchFinanceData();
    } catch (e) {
      Alert.alert(t('שגיאה', 'Error'), t('שגיאה בקליטת התשלום', 'Error recording payment'));
    } finally {
      setSavingPayment(false);
    }
  };

  if (loading && !refreshing) {
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />}
      >
        {/* Stats Section */}
        <View className="flex-row justify-between mb-10">
          <View style={{ width: '48%' }}>
            <StatCard 
              title={t('הכנסה חודשית', 'Revenue')} 
              value={`₪${totalMonthlyRevenue.toLocaleString()}`} 
              icon={<DollarSign color="#22c55e" size={18} />} 
              color="bg-[#22c55e]/10" 
              borderColor="border-[#22c55e]/20"
            />
          </View>
          <View style={{ width: '48%' }}>
            <StatCard 
              title={t('חובות כוללים', 'Debt')} 
              value={`₪${totalDebt.toLocaleString()}`} 
              icon={<TrendingDown color="#ef4444" size={18} />} 
              color="bg-[#ef4444]/10" 
              borderColor="border-[#ef4444]/20"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-12">
          <TouchableOpacity 
            onPress={handleChargeAll}
            className="flex-1 bg-[#111111] border border-amber-500/20 rounded-2xl py-4 flex-row items-center justify-center gap-2"
          >
            <TrendingUp color="#f59e0b" size={18} />
            <Text className="text-amber-500 font-bold text-xs">{t('חיוב חכם', 'Collect')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setPayModalVisible(true)}
            className="flex-1 bg-[#22c55e] rounded-2xl py-4 flex-row items-center justify-center gap-2 shadow-lg shadow-[#22c55e]/20"
          >
            <Plus color="#ffffff" size={18} />
            <Text className="text-white font-bold text-xs">{t('רשום תשלום', 'Pay')}</Text>
          </TouchableOpacity>
        </View>

        {/* List Header */}
        <View className="flex-row items-center justify-between mb-6 px-1">
           <View>
             <Text className="text-white font-bold text-lg">{t('מנויי ספורטאים', 'Subscriptions')}</Text>
             <View className="w-8 h-1 bg-[#22c55e] rounded-full mt-1" />
           </View>
           <Text className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">{subscriptions.length} {t('מנויים', 'ATHLETES')}</Text>
        </View>
        
        {subscriptions.length === 0 ? (
          <View className="bg-[#111111] border border-neutral-800 rounded-[32px] py-16 items-center">
            <Users color="#262626" size={48} />
            <Text className="text-neutral-500 text-center mt-4 font-medium">{t('אין מנויים פעילים עדיין', 'No active subscriptions yet')}</Text>
          </View>
        ) : (
          subscriptions.map(sub => (
            <TouchableOpacity key={sub.id} activeOpacity={0.7} className="bg-[#111111] border border-neutral-800 rounded-3xl p-5 mb-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-4">
                <View className="items-start">
                   <Text className={`font-black text-xl ${Number(sub.balance ?? 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    ₪{sub.balance ?? 0}
                  </Text>
                  <Text className="text-neutral-500 text-[10px] uppercase tracking-tighter font-bold">{t('יתרה נוכחית', 'BALANCE')}</Text>
                </View>
                <View className="items-end flex-1 ml-4">
                  <Text className="text-white font-bold text-lg mb-0.5" numberOfLines={1}>{sub.full_name || sub.email}</Text>
                  <View className={`px-2 py-0.5 rounded-full ${sub.is_active ? 'bg-green-500/10' : 'bg-neutral-800'} self-end`}>
                    <Text className={`text-[9px] font-bold uppercase ${sub.is_active ? 'text-green-500' : 'text-neutral-500'}`}>
                      {sub.is_active ? t('פעיל', 'ACTIVE') : t('מבוטל', 'INACTIVE')}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View className="flex-row justify-between items-center pt-4 border-t border-neutral-800/50">
                <View className="flex-row items-center gap-1.5">
                  <CreditCard color="#52525b" size={14} />
                  <Text className="text-neutral-400 text-xs font-medium">₪{sub.monthly_fee} / {t('חודש', 'mo')}</Text>
                </View>
                <TouchableOpacity className="flex-row items-center gap-1 bg-white/5 px-3 py-1.5 rounded-full">
                  <Text className="text-neutral-300 text-xs font-bold">{t('פרטים', 'View')}</Text>
                  <ChevronRight color="#a3a3a3" size={14} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Payment Modal */}
      <Modal
        visible={payModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPayModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-[#111111] rounded-t-[32px] p-6 border-t border-neutral-800">
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity onPress={() => setPayModalVisible(false)} className="p-2">
                <X color="#52525b" size={24} />
              </TouchableOpacity>
              <Text className="text-white text-xl font-bold">{t('רישום תשלום', 'Record Payment')}</Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-neutral-400 text-right mb-2 text-sm">{t('בחר ספורטאי', 'Select Athlete')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  {subscriptions.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setPaymentAthleteId(s.athlete_id)}
                      className={`px-4 py-3 rounded-xl border ${paymentAthleteId === s.athlete_id ? 'bg-[#22c55e]/10 border-[#22c55e]' : 'bg-neutral-900 border-neutral-800'}`}
                    >
                      <Text className={`font-bold ${paymentAthleteId === s.athlete_id ? 'text-[#22c55e]' : 'text-neutral-500'}`}>
                        {s.full_name || s.email}
                      </Text>
                      {Number(s.balance ?? 0) > 0 && (
                        <Text className="text-[10px] text-red-500 text-center">₪{s.balance}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View className="mt-4">
                <Text className="text-neutral-400 text-right mb-2 text-sm">{t('סכום התשלום (₪)', 'Amount')}</Text>
                <TextInput
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white text-right"
                  placeholder="0"
                  placeholderTextColor="#52525b"
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
              </View>

              <TouchableOpacity
                onPress={handleAddPayment}
                disabled={savingPayment || !paymentAthleteId || !paymentAmount}
                className={`bg-[#22c55e] rounded-2xl p-4 items-center mt-6 ${savingPayment || !paymentAthleteId || !paymentAmount ? 'opacity-50' : ''}`}
              >
                {savingPayment ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-lg">{t('רשום תשלום', 'Record Payment')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ title, value, icon, color, borderColor }: { title: string, value: string, icon: React.ReactNode, color: string, borderColor: string }) {
  return (
    <View className={`flex-1 ${color} border ${borderColor} rounded-3xl p-4`}>
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-7 h-7 bg-white/10 rounded-lg items-center justify-center">
          {icon}
        </View>
        <Text className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">{title}</Text>
      </View>
      <Text className="text-xl font-black text-white">{value}</Text>
    </View>
  );
}
