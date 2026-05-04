import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Wrench, Play, Pause, RotateCcw, Timer as TimerIcon } from 'lucide-react-native';

export default function ToolsScreen() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startStop = () => {
    if (isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      const startTime = Date.now() - time;
      timerRef.current = setInterval(() => {
        setTime(Date.now() - startTime);
      }, 10);
    }
    setIsRunning(!isRunning);
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTime(0);
    setIsRunning(false);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="flex-row items-center justify-end gap-3 mb-8">
          <Text className="text-white text-2xl font-bold">כלים ומדידות</Text>
          <View className="w-10 h-10 rounded-xl bg-[#22c55e]/10 items-center justify-center">
            <Wrench color="#22c55e" size={24} />
          </View>
        </View>

        {/* Smart Stopwatch Card */}
        <View className="bg-[#111111] border border-neutral-800 rounded-[32px] p-8 items-center">
          <View className="flex-row items-center gap-2 mb-6">
            <Text className="text-neutral-400 font-bold">סטופר חכם</Text>
            <TimerIcon color="#52525b" size={16} />
          </View>
          
          <Text className="text-white text-6xl font-black mb-10 tracking-tighter" style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
            {formatTime(time)}
          </Text>

          <View className="flex-row gap-4">
            <TouchableOpacity 
              onPress={reset}
              className="w-16 h-16 rounded-full bg-neutral-800 items-center justify-center"
            >
              <RotateCcw color="#ffffff" size={24} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={startStop}
              className={`w-16 h-16 rounded-full items-center justify-center ${isRunning ? 'bg-red-500/20' : 'bg-[#22c55e]'}`}
            >
              {isRunning ? <Pause color="#ef4444" size={24} fill="#ef4444" /> : <Play color="#ffffff" size={24} fill="#ffffff" />}
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8 bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6">
          <Text className="text-blue-400 text-right font-bold mb-2">מחשבוני קצב (בקרוב)</Text>
          <Text className="text-neutral-500 text-right text-xs leading-5">
            כאן תוכלו לחשב קצבי מטרה לפי זמני תחרות, אחוזי דופק והספקים (Watts).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Platform } from 'react-native';
