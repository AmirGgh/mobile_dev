import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api as supabase } from '../../lib/api';

export default function AthleteOnboarding() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim() || !inviteCode.trim()) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validate invite code
    const { data: inviteData, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.trim())
      .single();

    if (inviteError || !inviteData) {
      setLoading(false);
      Alert.alert('שגיאה', 'קוד הצטרפות לא חוקי');
      return;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id);

    if (profileError) {
      setLoading(false);
      Alert.alert('שגיאה', 'שגיאה בעדכון הפרופיל');
      return;
    }

    // Link to group
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        athlete_id: user.id,
        group_id: inviteData.group_id
      });

    setLoading(false);
    
    if (memberError) {
      Alert.alert('שגיאה', 'שגיאה בחיבור לקבוצה');
      return;
    }

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 px-6 justify-center">
        <View className="bg-neutral-900/80 rounded-[32px] p-8 border border-neutral-800">
          <Text className="text-white text-3xl font-black text-center mb-2">הרשמה כספורטאי</Text>
          <Text className="text-neutral-400 text-center mb-10 text-base">מלא את הפרטים להרשמה</Text>

          <View className="mb-6">
            <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">שם מלא</Text>
            <TextInput
              className="bg-neutral-950 border border-neutral-800 rounded-2xl h-16 px-5 text-white text-right text-base"
              placeholder="למשל: ישראל ישראלי"
              placeholderTextColor="#52525b"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View className="mb-10">
            <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">קוד הצטרפות</Text>
            <TextInput
              className="bg-neutral-950 border border-neutral-800 rounded-2xl h-16 px-5 text-white text-right text-base tracking-widest"
              placeholder="הזן את הקוד שקיבלת מהמאמן"
              placeholderTextColor="#52525b"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity 
            onPress={handleSubmit}
            disabled={loading}
            className="bg-[#22c55e] rounded-2xl h-16 items-center justify-center flex-row shadow-lg shadow-green-900/50"
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-neutral-950 font-bold text-lg">הירשם</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
