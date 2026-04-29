import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { api as supabase } from '../../lib/api';
import { useRouter } from 'expo-router';
import { Mail, Lock, ChevronLeft, Activity } from 'lucide-react-native';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  async function resendConfirmation() {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) {
      Alert.alert('שגיאה', error.message);
    } else {
      Alert.alert('נשלח', 'אימייל אימות נשלח בהצלחה. אנא בדוק את תיבת הדואר שלך.');
    }
  }

  async function signInWithEmail() {
    setLoading(true);
    setErrorMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.log('Supabase Auth Error FULL Object:', JSON.stringify(error, null, 2));
      setErrorMessage(error.message);
      if (error.message.includes('Email not confirmed')) {
        Alert.alert(
          'אימות אימייל נדרש',
          'כתובת האימייל שלך טרם אומתה. האם תרצה שנשלח לך אימייל אימות חדש?',
          [
            { text: 'ביטול', style: 'cancel' },
            { text: 'שלח שוב', onPress: resendConfirmation }
          ]
        );
      } else {
        Alert.alert('שגיאה בהתחברות', error.message);
      }
    } else {
      // Login successful, navigation handled by auth listener
    }
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-900">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 justify-center px-8">
            
            <View className="items-center mb-12">
              <View className="w-16 h-16 bg-neutral-800 rounded-2xl items-center justify-center mb-6">
                <Activity color="#ffffff" size={32} />
              </View>
              <Text className="text-white text-4xl font-bold tracking-widest mb-2">TriPro</Text>
              <Text className="text-neutral-400 text-sm font-medium">אימון מקצועי לטריאתלטים</Text>
            </View>

            <View className="mb-8">
              <View className="mb-4">
                <Text className="text-neutral-400 text-sm mb-2 text-right">דוא״ל</Text>
                <View className="flex-row items-center bg-neutral-800 rounded-xl px-4 h-14 border border-neutral-700">
                  <TextInput
                    className="flex-1 text-white text-right text-base h-full"
                    placeholder="הכנס דוא״ל"
                    placeholderTextColor="#6b7280"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <Mail color="#9ca3af" size={20} className="ml-3" />
                </View>
              </View>

              <View className="mb-2">
                <Text className="text-neutral-400 text-sm mb-2 text-right">סיסמה</Text>
                <View className="flex-row items-center bg-neutral-800 rounded-xl px-4 h-14 border border-neutral-700">
                  <TextInput
                    className="flex-1 text-white text-right text-base h-full"
                    placeholder="הכנס סיסמה"
                    placeholderTextColor="#6b7280"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  <Lock color="#9ca3af" size={20} className="ml-3" />
                </View>
              </View>

              <TouchableOpacity className="mt-2 py-2">
                <Text className="text-neutral-500 text-sm text-right">שכחת סיסמה?</Text>
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <View className="bg-red-500 rounded-lg p-3 mb-6">
                <Text className="text-white text-center text-sm font-medium">{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity 
              className="w-full bg-white rounded-xl h-14 items-center flex-row justify-center"
              onPress={signInWithEmail}
              disabled={loading}
            >
              {!loading && <ChevronLeft color="#171717" size={24} className="mr-2" />}
              <Text className="text-neutral-900 font-bold text-lg">
                {loading ? 'מתחבר...' : 'התחברות'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="mt-8 items-center py-2"
              onPress={() => router.push('/(auth)/role-selection')}
            >
              <Text className="text-neutral-400 text-sm">
                משתמש חדש? <Text className="text-white font-bold">הירשם כאן</Text>
              </Text>
            </TouchableOpacity>
            
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
