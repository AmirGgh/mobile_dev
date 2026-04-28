import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Dumbbell } from 'lucide-react-native';

export default function RoleSelection() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <View className="flex-1 justify-center px-8">
        <Text className="text-white text-4xl font-bold text-center mb-2 tracking-wide">הרשמה ל-TriPro</Text>
        <Text className="text-neutral-400 text-center mb-12">בחר את סוג המשתמש שלך</Text>
        
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
              <Text className="text-white text-xl font-bold text-right mb-1">ספורטאי</Text>
              <Text className="text-neutral-400 text-sm text-right">אני רוצה להצטרף לקבוצה ולהתאמן</Text>
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
              <Text className="text-white text-xl font-bold text-right mb-1">מאמן ראשי</Text>
              <Text className="text-neutral-400 text-sm text-right">אני רוצה להקים ולנהל מועדון</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          className="mt-8 items-center py-2"
          onPress={() => router.back()}
        >
          <Text className="text-neutral-400 text-sm">
            חזור למסך <Text className="text-white font-bold">התחברות</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
