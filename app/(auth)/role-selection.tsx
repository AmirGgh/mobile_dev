import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Dumbbell } from 'lucide-react-native';
import { useLanguage } from '../../lib/LanguageContext';

export default function RoleSelection() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <View className="flex-1 justify-center px-8">
        <Text className="text-white text-4xl font-bold text-center mb-2 tracking-wide">
          {t('הרשמה ל-TriPro', 'Sign Up for TriPro')}
        </Text>
        <Text className="text-neutral-400 text-center mb-12">
          {t('בחר את סוג המשתמש שלך', 'Choose your account type')}
        </Text>
        
        <View className="mb-4">
          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/(auth)/signup', params: { selectedRole: 'athlete' } })}
            className="bg-neutral-900 p-6 rounded-3xl flex-row items-center border border-neutral-800 mb-6 shadow-lg"
            activeOpacity={0.8}
          >
            <View className="bg-blue-500/10 p-4 rounded-full mr-4 border border-blue-500/20">
              <User color="#3b82f6" size={32} />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xl font-bold mb-1">
                {t('ספורטאי', 'Athlete')}
              </Text>
              <Text className="text-neutral-400 text-sm">
                {t('אני רוצה להצטרף לקבוצה ולהתאמן', 'I want to join a team and train')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push({ pathname: '/(auth)/signup', params: { selectedRole: 'head_coach' } })}
            className="bg-neutral-900 p-6 rounded-3xl flex-row items-center border border-neutral-800 shadow-lg"
            activeOpacity={0.8}
          >
            <View className="bg-green-500/10 p-4 rounded-full mr-4 border border-green-500/20">
              <Dumbbell color="#22c55e" size={32} />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xl font-bold mb-1">
                {t('מאמן ראשי', 'Head Coach')}
              </Text>
              <Text className="text-neutral-400 text-sm">
                {t('אני רוצה להקים ולנהל מועדון', 'I want to create and manage a club')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          className="mt-8 items-center py-2"
          onPress={() => router.back()}
        >
          <Text className="text-neutral-400 text-sm">
            {t('חזור למסך ', 'Back to ')}
            <Text className="text-white font-bold">
              {t('התחברות', 'Login')}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
