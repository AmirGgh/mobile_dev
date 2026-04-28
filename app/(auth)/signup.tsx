import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, User as UserIcon, Link } from 'lucide-react-native';

export default function SignUp() {
  const router = useRouter();
  const { selectedRole } = useLocalSearchParams<{ selectedRole: string }>();

  const [fullName, setFullName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Treat both 'coach' and 'head_coach' as a coach role
  const isCoach = selectedRole === 'head_coach' || selectedRole === 'coach';
  // Always send the strict DB enum value
  const dbRole = isCoach ? 'head_coach' : 'athlete';
  const roleText = isCoach ? 'מאמן' : 'ספורטאי';

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('שגיאה', 'אנא מלא את כל שדות החובה');
      return;
    }
    if (isCoach && !groupName.trim()) {
      Alert.alert('שגיאה', 'אנא הזן שם מועדון / קבוצה');
      return;
    }
    if (!isCoach && !inviteCode.trim()) {
      Alert.alert('שגיאה', 'אנא הזן קוד הצטרפות');
      return;
    }

    setLoading(true);

    // ── Step 1: Validate invite code for athletes BEFORE signup ──────────────
    let groupToJoin: string | null = null;
    if (!isCoach) {
      const { data: inviteData, error: inviteError } = await supabase
        .from('invite_codes')
        .select('group_id')
        .eq('code', inviteCode.trim())
        .single();

      if (inviteError || !inviteData) {
        console.error('Invite code error:', JSON.stringify(inviteError, null, 2));
        setLoading(false);
        Alert.alert('שגיאה', 'קוד הצטרפות לא חוקי');
        return;
      }
      groupToJoin = inviteData.group_id;
    }

    // ── Step 2: Sign up — pass metadata so the DB trigger handles everything ──
    // The `handle_new_user` trigger on auth.users reads raw_user_meta_data
    // and automatically creates: profiles, groups (for head_coach), club_billing_profiles.
    // DO NOT manually insert into those tables — it violates RLS.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          // CRITICAL: must match the DB enum exactly — 'head_coach' or 'athlete'
          role: dbRole,
          // DB trigger reads this to name the group when role === 'head_coach'.
          // Fallback ensures trigger never receives undefined/empty and skips group creation.
          group_name: isCoach
            ? (groupName.trim() || `מועדון ${fullName.trim()}` || 'מועדון חדש')
            : undefined,
        },
      },
    });

    console.log('[SignUp] Payload sent — role:', dbRole, '| group_name:', isCoach ? groupName.trim() : 'N/A');

    if (signUpError) {
      console.error('Auth signUp error:', JSON.stringify(signUpError, null, 2));
      setLoading(false);

      if (signUpError.message.toLowerCase().includes('already registered')) {
        Alert.alert(
          'משתמש קיים',
          'כתובת האימייל הזו כבר רשומה. עבור למסך ההתחברות.',
          [{ text: 'להתחברות', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        Alert.alert('שגיאה בהרשמה', signUpError.message);
      }
      return;
    }

    // ── Step 3: Handle email-confirmation-required state ──────────────────────
    // When Supabase "Confirm email" is ON → user exists but session is null.
    if (!data.session && data.user) {
      setLoading(false);
      Alert.alert(
        'בדוק את האימייל שלך',
        'נשלח אליך מייל לאימות. לאחר האישור חזור ולחץ "כניסה".',
        [{ text: 'אישור', onPress: () => router.replace('/(auth)/login') }]
      );
      return;
    }

    const user = data.user;
    if (!user) {
      setLoading(false);
      Alert.alert('שגיאה', 'לא הצלחנו לקבל פרטי המשתמש. נסה שוב.');
      return;
    }

    // ── Step 4: Link athlete to group (only manual step remaining) ────────────
    // group_members has no trigger — this is a deliberate user action, not auto-created.
    if (!isCoach && groupToJoin) {
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ athlete_id: user.id, group_id: groupToJoin });

      if (memberError) {
        console.error('group_members insert error:', JSON.stringify(memberError, null, 2));
        // Non-fatal: athlete is created, but not yet linked. Coach can fix via dashboard.
      }
    }

    setLoading(false);

    // ── Step 5: Route to next screen ──────────────────────────────────────────
    if (isCoach) {
      router.replace('/(auth)/coach-onboarding/subgroups');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 justify-center px-6">

            <View className="items-center mb-10">
              <Text className="text-white text-3xl font-black tracking-widest mb-2">הרשמה כ{roleText}</Text>
              <Text className="text-neutral-400 text-sm font-medium">מלא את הפרטים להרשמה</Text>
            </View>

            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">שם מלא</Text>
              <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 h-16 border border-neutral-800">
                <TextInput
                  className="flex-1 text-white text-right text-base h-full"
                  placeholder="ישראל ישראלי"
                  placeholderTextColor="#52525b"
                  value={fullName}
                  onChangeText={setFullName}
                />
                <UserIcon color="#9ca3af" size={20} className="ml-3" />
              </View>
            </View>

            {/* Club Name (Coaches only) */}
            {isCoach && (
              <View className="mb-4">
                <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">שם המועדון / קבוצה</Text>
                <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 h-16 border border-neutral-800">
                  <TextInput
                    className="flex-1 text-white text-right text-base h-full"
                    placeholder="למשל: מועדון TriPro תל-אביב"
                    placeholderTextColor="#52525b"
                    value={groupName}
                    onChangeText={setGroupName}
                  />
                  <UserIcon color="#22c55e" size={20} className="ml-3" />
                </View>
              </View>
            )}

            {/* Email */}
            <View className="mb-4">
              <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">אימייל</Text>
              <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 h-16 border border-neutral-800">
                <TextInput
                  className="flex-1 text-white text-right text-base h-full"
                  placeholder="you@example.com"
                  placeholderTextColor="#52525b"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Mail color="#9ca3af" size={20} className="ml-3" />
              </View>
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">סיסמה</Text>
              <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 h-16 border border-neutral-800">
                <TextInput
                  className="flex-1 text-white text-right text-base h-full"
                  placeholder="לפחות 6 תווים"
                  placeholderTextColor="#52525b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <Lock color="#9ca3af" size={20} className="ml-3" />
              </View>
            </View>

            {/* Invite Code (Athletes only) */}
            {!isCoach && (
              <View className="mb-4">
                <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">קוד הצטרפות</Text>
                <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 h-16 border border-neutral-800">
                  <TextInput
                    className="flex-1 text-white text-right text-base h-full tracking-widest"
                    placeholder="הזן קוד"
                    placeholderTextColor="#52525b"
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="characters"
                  />
                  <Link color="#9ca3af" size={20} className="ml-3" />
                </View>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading}
              className={`rounded-2xl h-16 items-center justify-center mt-4 ${isCoach ? 'bg-[#22c55e]' : 'bg-blue-600'}`}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color={isCoach ? '#09090b' : '#fff'} />
                : <Text className={`${isCoach ? 'text-neutral-950' : 'text-white'} font-bold text-lg`}>הירשם</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity className="mt-6 items-center py-2" onPress={() => router.back()}>
              <Text className="text-neutral-400 text-sm">חזרה לבחירת תפקיד</Text>
            </TouchableOpacity>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
