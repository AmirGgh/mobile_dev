import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { api as supabase } from '../../lib/api';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../lib/LanguageContext';
import { User, LogOut, Globe, ChevronRight, Award, Zap } from 'lucide-react-native';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) setProfile(data);
    }
    setLoading(false);
  }

  async function handleLogout() {
    Alert.alert(
      t('התנתקות', 'Logout'),
      t('האם אתה בטוח שברצונך להתנתק?', 'Are you sure you want to logout?'),
      [
        { text: t('ביטול', 'Cancel'), style: 'cancel' },
        { 
          text: t('התנתק', 'Logout'), 
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
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

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <ScrollView className="flex-1 px-6 pt-4">
        {/* Profile Header */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-neutral-900 border-2 border-[#22c55e]/30 items-center justify-center mb-4">
            <User color="#22c55e" size={48} />
          </View>
          <Text className="text-white text-2xl font-bold mb-1">{profile?.full_name || t('newUser', 'New User')}</Text>
          <Text className="text-neutral-500 text-sm">{profile?.email}</Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row gap-4 mb-8">
          <View className="flex-1 bg-[#111111] border border-neutral-800 rounded-2xl p-4 items-center">
            <View className="w-8 h-8 rounded-full bg-blue-500/10 items-center justify-center mb-2">
              <Zap color="#3b82f6" size={16} />
            </View>
            <Text className="text-white font-bold text-lg">{profile?.total_xp || 0}</Text>
            <Text className="text-neutral-500 text-[10px] uppercase tracking-widest">{t('totalXp', 'Total XP')}</Text>
          </View>
          <View className="flex-1 bg-[#111111] border border-neutral-800 rounded-2xl p-4 items-center">
            <View className="w-8 h-8 rounded-full bg-amber-500/10 items-center justify-center mb-2">
              <Award color="#f59e0b" size={16} />
            </View>
            <Text className="text-white font-bold text-lg">{profile?.level || 1}</Text>
            <Text className="text-neutral-500 text-[10px] uppercase tracking-widest">{t('rank', 'Rank')}</Text>
          </View>
        </View>

        {/* Settings Section */}
        <Text className="text-neutral-500 text-right text-xs font-bold mb-3 uppercase tracking-widest px-2">{t('הגדרות', 'Settings')}</Text>
        
        <View className="bg-[#111111] border border-neutral-800 rounded-3xl overflow-hidden mb-6">
          {/* Language Selection */}
          <View className="p-4 border-b border-neutral-800">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-3">
                <Globe color="#52525b" size={20} />
                <Text className="text-white font-bold">{t('שפת אפליקציה', 'App Language')}</Text>
              </View>
            </View>
            
            <View className="flex-row gap-2">
              <TouchableOpacity 
                onPress={() => setLanguage('he')}
                className={`flex-1 p-3 rounded-xl border items-center ${language === 'he' ? 'bg-[#22c55e]/10 border-[#22c55e]' : 'bg-neutral-900 border-neutral-800'}`}
              >
                <Text className={`font-bold ${language === 'he' ? 'text-[#22c55e]' : 'text-neutral-500'}`}>עברית</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setLanguage('en')}
                className={`flex-1 p-3 rounded-xl border items-center ${language === 'en' ? 'bg-[#22c55e]/10 border-[#22c55e]' : 'bg-neutral-900 border-neutral-800'}`}
              >
                <Text className={`font-bold ${language === 'en' ? 'text-[#22c55e]' : 'text-neutral-500'}`}>English</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dummy Settings for UI Polish */}
          <TouchableOpacity className="p-4 flex-row items-center justify-between border-b border-neutral-800">
            <ChevronRight color="#262626" size={20} />
            <Text className="text-neutral-400">{t('התראות', 'Notifications')}</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          onPress={handleLogout}
          className="bg-red-500/10 border border-red-500/20 p-5 rounded-3xl flex-row items-center justify-center gap-3 mb-10"
        >
          <LogOut color="#ef4444" size={20} />
          <Text className="text-red-500 font-bold text-lg">{t('logout', 'Logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
