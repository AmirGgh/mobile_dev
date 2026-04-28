import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { View, Text } from 'react-native';
import { Wrench } from 'lucide-react-native';

export default function ToolsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-20 h-20 rounded-full bg-[#22c55e]/10 items-center justify-center mb-6">
          <Wrench color="#22c55e" size={40} />
        </View>
        <Text className="text-white text-2xl font-bold mb-2">כלים וסטופר חכם</Text>
        <Text className="text-neutral-500 text-center">
          כאן יופיעו הכלים המיוחדים למאמנים כמו סטופר רב-משתתפים ומחשבוני קצב.
        </Text>
      </View>
    </SafeAreaView>
  );
}
