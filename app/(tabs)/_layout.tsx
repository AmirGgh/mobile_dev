import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Home, User, Bot, CalendarDays, Users, Wrench } from 'lucide-react-native';
import { useLanguage } from '../../lib/LanguageContext';

export default function TabLayout() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#22c55e',
      headerShown: true,
      tabBarStyle: { backgroundColor: '#09090b', borderTopColor: '#262626' },
      headerStyle: { backgroundColor: '#09090b' },
      headerTintColor: '#ffffff',
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => router.push('/profile')}
          style={{ marginRight: 16 }}
        >
          <User size={24} color="#ffffff" />
        </TouchableOpacity>
      ),
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('בית', 'Home'),
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('לוח אימונים', 'Calendar'),
          tabBarIcon: ({ color }) => <CalendarDays size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          title: t('קבוצות', 'Roster'),
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t('כלים', 'Tools'),
          tabBarIcon: ({ color }) => <Wrench size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-coach"
        options={{
          title: t('מאמן AI', 'AI Coach'),
          tabBarIcon: ({ color }) => <Bot size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: t('פרופיל', 'Profile'),
        }}
      />
      {/* Hidden stub screens — suppress Expo Router warnings */}
      <Tabs.Screen name="stats" options={{ href: null }} />
    </Tabs>
  );
}

