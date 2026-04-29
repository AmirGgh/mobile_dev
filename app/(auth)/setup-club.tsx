import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api as supabase } from '../../lib/api';
import { Check } from 'lucide-react-native';

export default function SetupClub() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data state
  const [clubName, setClubName] = useState('');
  const [subgroups, setSubgroups] = useState([{ name: '', sport: 'טריאתלון', level: 'מתחילים', goal: '' }]);

  const nextStep = () => setStep(prev => prev + 1);

  const finishOnboarding = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create Group (Club) using the provided clubName or a default
    const finalClubName = clubName.trim() || 'מועדון ללא שם';
    const { data: group } = await supabase
      .from('groups')
      .insert({ name: finalClubName, head_coach_id: user.id })
      .select()
      .single();

    if (group) {
      // Create subgroups
      for (const sg of subgroups) {
        if (sg.name) {
          await supabase.from('subgroups').insert({
            group_id: group.id,
            name: sg.name,
            sport_type: sg.sport,
            level: sg.level
          });
        }
      }
    }

    setLoading(false);
    router.replace('/(tabs)');
  };

  const renderStep1 = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-white text-3xl font-black text-center mb-2">הקמת תתי קבוצות</Text>
      <Text className="text-neutral-400 text-center mb-8 text-base">הגדר את הקבוצות שלך - עד 5 תתי קבוצות</Text>
      
      <View className="mb-6 px-2">
        <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">שם המועדון הכולל:</Text>
        <TextInput
          className="bg-neutral-900 border border-neutral-800 rounded-xl h-14 px-4 text-white text-right"
          placeholder="למשל: TriPro תל אביב"
          placeholderTextColor="#52525b"
          value={clubName}
          onChangeText={setClubName}
        />
      </View>

      {subgroups.map((sg, index) => (
        <View key={index} className="bg-neutral-900/80 border border-neutral-800 rounded-[24px] p-6 mb-6">
          <Text className="text-white font-bold text-right mb-6 text-lg">תת-קבוצה {index + 1}</Text>
          
          <View className="mb-6">
            <Text className="text-neutral-400 text-sm mb-2 text-right font-medium">שם:</Text>
            <TextInput
              className="bg-neutral-950 border border-neutral-800 rounded-xl h-14 px-4 text-white text-right"
              placeholder="למשל: ילדים עד גיל 12"
              placeholderTextColor="#52525b"
              value={sg.name}
              onChangeText={(text) => {
                const newSg = [...subgroups];
                newSg[index].name = text;
                setSubgroups(newSg);
              }}
            />
          </View>

          <View className="mb-2">
             <Text className="text-neutral-400 text-sm mb-3 text-right font-medium">רמה:</Text>
             <View className="flex-row justify-end flex-wrap gap-2">
               {['מתחילים', 'בינוניים', 'תחרותיים'].map(lvl => (
                 <TouchableOpacity 
                   key={lvl}
                   onPress={() => {
                     const newSg = [...subgroups];
                     newSg[index].level = lvl;
                     setSubgroups(newSg);
                   }}
                   className={`px-6 py-3 rounded-full border ${sg.level === lvl ? 'bg-[#22c55e]/20 border-[#22c55e]' : 'bg-neutral-950 border-neutral-800'}`}
                 >
                   <Text className={sg.level === lvl ? 'text-[#22c55e] font-bold' : 'text-neutral-400'}>{lvl}</Text>
                 </TouchableOpacity>
               ))}
             </View>
          </View>
        </View>
      ))}

      {subgroups.length < 5 && (
        <TouchableOpacity 
          onPress={() => setSubgroups([...subgroups, { name: '', sport: 'טריאתלון', level: 'מתחילים', goal: '' }])}
          className="bg-neutral-900/50 border border-dashed border-neutral-700 rounded-2xl h-16 items-center justify-center mb-8"
        >
          <Text className="text-neutral-400 font-medium">+ הוסף תת-קבוצה ({subgroups.length}/5)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        onPress={nextStep}
        disabled={!clubName.trim() || subgroups.every(sg => !sg.name.trim())}
        className={`rounded-2xl h-16 items-center justify-center mt-4 ${(!clubName.trim() || subgroups.every(sg => !sg.name.trim())) ? 'bg-neutral-800' : 'bg-[#22c55e]'}`}
        activeOpacity={0.8}
      >
        <Text className={`${(!clubName.trim() || subgroups.every(sg => !sg.name.trim())) ? 'text-neutral-500' : 'text-neutral-950'} font-bold text-lg`}>המשך לסיכום ותשלום</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep2 = () => (
    <View className="flex-1 justify-center pb-20">
      <Text className="text-white text-3xl font-black text-center mb-8">סיכום ותשלום</Text>
      <View className="bg-neutral-900/80 border border-neutral-800 rounded-[32px] p-8 mb-10">
        <Text className="text-white text-xl text-right mb-4 font-bold">{clubName}</Text>
        <Text className="text-neutral-400 text-right mb-6 text-base">מספר תתי-קבוצות מנוהלות: {subgroups.filter(sg => sg.name.trim()).length}</Text>
        
        <View className="h-px w-full bg-neutral-800 mb-6" />
        
        <Text className="text-neutral-400 text-center mb-2">{"סה\"כ לתשלום חודשי:"}</Text>
        <Text className="text-[#22c55e] text-4xl font-black text-center">₪{subgroups.filter(sg => sg.name.trim()).length * 150}</Text>
      </View>

      <TouchableOpacity 
        onPress={nextStep}
        className="bg-[#22c55e] rounded-2xl h-16 items-center justify-center flex-row shadow-lg shadow-green-900/50"
      >
        <Text className="text-neutral-950 font-bold text-lg">אישור והמשך לתוכנית AI</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View className="flex-1 justify-center pb-20">
      <Text className="text-white text-3xl font-black text-center mb-8">תוכנית אימונים AI</Text>
      <View className="bg-neutral-900/80 border border-neutral-800 rounded-[32px] p-8 mb-10 items-center justify-center min-h-[300px]">
        <ActivityIndicator size="large" color="#22c55e" className="mb-6" />
        <Text className="text-white text-lg font-bold text-center mb-2">מנתח פרופילי קבוצות...</Text>
        <Text className="text-neutral-400 text-center px-4">ה-AI של TriPro בונה כעת את מעטפת האימונים האופטימלית לקבוצות שלך.</Text>
      </View>

      <TouchableOpacity 
        onPress={finishOnboarding}
        disabled={loading}
        className="bg-white rounded-2xl h-16 items-center justify-center flex-row"
      >
        {loading ? <ActivityIndicator color="#09090b" /> : (
          <>
            <Check color="#09090b" size={24} className="mr-2" />
            <Text className="text-neutral-950 font-bold text-lg">סיום והמשך לדשבורד</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 px-6 pt-6">
        
        {/* Progress indicators */}
        <View className="flex-row justify-center items-center mb-10">
          {[1,2,3].map(i => (
            <View key={i} className={`h-1.5 flex-1 rounded-full mx-1 ${step >= i ? 'bg-[#22c55e]' : 'bg-neutral-800'}`} />
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
