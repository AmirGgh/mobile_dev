import { Stack } from 'expo-router';

export default function RosterLayout() {
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
        options={{ title: 'הקבוצות שלי' }} 
      />
      <Stack.Screen 
        name="[subgroup_id]" 
        options={{ title: 'רשימת מתאמנים', headerBackTitle: 'חזור' }} 
      />
    </Stack>
  );
}
