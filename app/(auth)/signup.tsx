import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api as supabase } from '../../lib/api';
import { Mail, Lock, User as UserIcon, Link } from 'lucide-react-native';
import { useLanguage } from '../../lib/LanguageContext';

export default function SignUp() {
  const router = useRouter();
  const { selectedRole } = useLocalSearchParams<{ selectedRole: string }>();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const isCoach = selectedRole === 'head_coach' || selectedRole === 'coach';
  const dbRole = isCoach ? 'head_coach' : 'athlete';
  const roleText = isCoach ? t('מאמן', 'Coach') : t('ספורטאי', 'Athlete');

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('שגיאה', 'Error'), t('אנא מלא את כל שדות החובה', 'Please fill in all required fields'));
      return;
    }
    if (isCoach && !groupName.trim()) {
      Alert.alert(t('שגיאה', 'Error'), t('אנא הזן שם מועדון / קבוצה', 'Please enter a club / team name'));
      return;
    }
    if (!isCoach && !inviteCode.trim()) {
      Alert.alert(t('שגיאה', 'Error'), t('אנא הזן קוד הצטרפות', 'Please enter an invite code'));
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: dbRole,
          group_name: isCoach
            ? (groupName.trim() || `${t('מועדון', 'Club')} ${fullName.trim()}`)
            : '',
          invite_code: !isCoach ? inviteCode.trim() : undefined,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      if (signUpError.message.toLowerCase().includes('already registered')) {
        Alert.alert(
          t('משתמש קיים', 'Account Exists'),
          t('כתובת האימייל הזו כבר רשומה. עבור למסך ההתחברות.', 'This email is already registered. Go to login.'),
          [{ text: t('להתחברות', 'Login'), onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        Alert.alert(t('שגיאה בהרשמה', 'Sign Up Error'), signUpError.message);
      }
      return;
    }

    if (data && !data.session && data.user) {
      setLoading(false);
      Alert.alert(
        t('בדוק את האימייל שלך', 'Check Your Email'),
        t('נשלח אליך מייל לאימות. לאחר האישור חזור ולחץ "כניסה".', 'A verification email has been sent. After confirming, come back and log in.'),
        [{ text: t('אישור', 'OK'), onPress: () => router.replace('/(auth)/login') }]
      );
      return;
    }

    const user = data?.user;
    if (!user) {
      setLoading(false);
      Alert.alert(t('שגיאה', 'Error'), t('לא הצלחנו לקבל פרטי המשתמש. נסה שוב.', 'Could not retrieve user details. Please try again.'));
      return;
    }

    setLoading(false);

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
              <Text className="text-white text-3xl font-black tracking-widest mb-2">
                {t('הרשמה כ', 'Sign Up as ')} {roleText}
              </Text>
              <Text className="text-neutral-400 text-sm font-medium">
                {t('מלא את הפרטים להרשמה', 'Fill in your details to register')}
              </Text>
            </View>

            {/* Full Name */}
            <View className="mb-4">
              <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">
                {t('שם מלא', 'Full Name')}
              </Text>
              <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 h-16 border border-neutral-800">
                <TextInput
                  className="flex-1 text-white text-right text-base h-full"
                  placeholder={t('ישראל ישראלי', 'John Smith')}
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
                <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">
                  {t('שם המועדון / קבוצה', 'Club / Team Name')}
                </Text>
                <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 h-16 border border-neutral-800">
                  <TextInput
                    className="flex-1 text-white text-right text-base h-full"
                    placeholder={t('למשל: מועדון TriPro תל-אביב', 'e.g. TriPro Club Tel Aviv')}
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
              <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">
                {t('אימייל', 'Email')}
              </Text>
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
              <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">
                {t('סיסמה', 'Password')}
              </Text>
              <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 h-16 border border-neutral-800">
                <TextInput
                  className="flex-1 text-white text-right text-base h-full"
                  placeholder={t('לפחות 6 תווים', 'At least 6 characters')}
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
                <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">
                  {t('קוד הצטרפות', 'Invite Code')}
                </Text>
                <View className="flex-row items-center bg-neutral-900 rounded-2xl px-4 h-16 border border-neutral-800">
                  <TextInput
                    className="flex-1 text-white text-right text-base h-full tracking-widest"
                    placeholder={t('הזן קוד', 'Enter code')}
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
                : <Text className={`${isCoach ? 'text-neutral-950' : 'text-white'} font-bold text-lg`}>
                    {t('הירשם', 'Register')}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity className="mt-6 items-center py-2" onPress={() => router.back()}>
              <Text className="text-neutral-400 text-sm">
                {t('חזרה לבחירת תפקיד', 'Back to role selection')}
              </Text>
            </TouchableOpacity>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
