import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { api as supabase } from '../../lib/api';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../lib/LanguageContext';

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
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  if (loading) return <ActivityIndicator className="flex-1" />;

  return (
    <View className="flex-1 bg-gray-100 p-6">
      <View className="bg-white p-6 rounded-2xl shadow-sm mb-6">
        <Text className="text-2xl font-bold text-gray-800">{profile?.full_name || t('newUser')}</Text>
        <Text className="text-gray-500">{profile?.email}</Text>
        
        <View className="flex-row mt-4 p-4 bg-blue-50 rounded-xl">
          <View className="flex-1 items-center border-r border-blue-100">
            <Text className="text-blue-600 font-bold text-xl">{profile?.total_xp || 0}</Text>
            <Text className="text-blue-400 text-xs">{t('totalXp')}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-blue-600 font-bold text-xl">{profile?.level || 1}</Text>
            <Text className="text-blue-400 text-xs">{t('rank')}</Text>
          </View>
        </View>
      </View>

      <View className="bg-white p-4 rounded-xl shadow-sm mb-6 flex-row items-center justify-between">
        <Text className="text-gray-800 font-medium text-lg">{t('englishMode')}</Text>
        <Switch 
          value={language === 'en'} 
          onValueChange={(val) => setLanguage(val ? 'en' : 'he')}
          trackColor={{ false: '#d1d5db', true: '#22c55e' }}
        />
      </View>

      <TouchableOpacity 
        onPress={handleLogout}
        className="bg-red-50 p-4 rounded-xl items-center"
      >
        <Text className="text-red-600 font-bold">{t('logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}
