import { Stack } from 'expo-router';
import { useLanguage } from '../../../lib/LanguageContext';

export default function RosterLayout() {
  const { t } = useLanguage();

  return (
    <Stack screenOptions={{ 
      headerShown: true,
      headerStyle: { backgroundColor: '#09090b' },
      headerTintColor: '#ffffff',
      headerShadowVisible: false,
      contentStyle: { backgroundColor: '#09090b' },
      headerTitleAlign: 'center',
    }}>
      <Stack.Screen 
        name="index" 
        options={{ title: t('הקבוצות שלי', 'My Groups') }} 
      />
      <Stack.Screen 
        name="[subgroup_id]" 
        options={{ title: t('רשימת מתאמנים', 'Roster'), headerBackTitle: t('חזור', 'Back') }} 
      />
    </Stack>
  );
}
