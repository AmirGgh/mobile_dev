import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import '../global.css';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentRoute = segments.join('/');

    // These screens are inside (auth) but control their own exit navigation.
    // An authenticated user must be allowed to stay here — do NOT redirect them to tabs.
    const SELF_NAVIGATING_ROUTES = [
      '(auth)/signup',                        // handles its own redirect after signUp()
      '(auth)/coach-onboarding/subgroups',
      '(auth)/coach-onboarding/dates',
      '(auth)/coach-onboarding/payment',
      '(auth)/coach-onboarding/ai-plan',
    ];
    const inOnboarding = SELF_NAVIGATING_ROUTES.includes(currentRoute);

    if (!session && !inAuthGroup) {
      // Unauthenticated user outside auth screens → send to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup && !inOnboarding) {
      // Authenticated user on a plain auth screen (login / signup / role-selection) → send to tabs
      router.replace('/(tabs)');
    }
    // If inOnboarding → do nothing; the onboarding screen controls its own navigation
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View className="flex-1 bg-[#09090b] items-center justify-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return <Slot />;
}
