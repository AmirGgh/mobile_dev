import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { askCoachChat } from '../../lib/ai-service';
import { Send, Bot, User } from 'lucide-react-native';

type Message = {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export default function AICoachScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchSessionAndMessages();
  }, []);

  const fetchSessionAndMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setSession(session);
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });
        
      if (!error && data && data.length > 0) {
        setMessages(data);
      } else {
        // Welcome message if no history
        setMessages([{
          id: 'welcome',
          user_id: session.user.id,
          role: 'assistant',
          content: 'היי! אני מאמן ה-AI שלך לטריאתלון. איך אוכל לעזור לך להתכונן לאימון הבא?',
          created_at: new Date().toISOString()
        }]);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !session) return;
    
    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Save user message to Supabase
    const { data: userData, error: userError } = await supabase
      .from('ai_messages')
      .insert({
        user_id: session.user.id,
        role: 'user',
        content: userMessage
      })
      .select()
      .single();

    if (!userError && userData) {
      setMessages(prev => [...prev, userData]);
    } else {
      // Fallback for UI if db fails
      setMessages(prev => [...prev, { id: Date.now().toString(), user_id: session.user.id, role: 'user', content: userMessage, created_at: new Date().toISOString() }]);
    }

    try {
      // Call AI — returns plain Hebrew text; off-topic is rejected naturally
      const aiResponseText = await askCoachChat(userMessage);

      // Save AI response to Supabase
      const { data: aiData, error: aiError } = await supabase
        .from('ai_messages')
        .insert({
          user_id: session.user.id,
          role: 'assistant',
          content: aiResponseText
        })
        .select()
        .single();

      if (!aiError && aiData) {
        setMessages(prev => [...prev, aiData]);
      } else {
         setMessages(prev => [...prev, { id: Date.now().toString(), user_id: session.user.id, role: 'assistant', content: aiResponseText, created_at: new Date().toISOString() }]);
      }
    } catch (error: any) {
      console.error("Failed to fetch AI response", error);
      Alert.alert('שגיאה', error?.message ?? 'לא הצלחנו לקבל תשובה מהמאמן. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View className={`flex-row mb-6 px-4 ${isUser ? 'justify-start' : 'justify-end flex-row-reverse'}`}>
        {!isUser && (
          <View className="bg-neutral-800 rounded-full w-10 h-10 items-center justify-center ml-3 mt-1 border border-neutral-700">
            <Bot color="#22c55e" size={20} />
          </View>
        )}
        <View className={`max-w-[75%] rounded-[20px] p-4 ${isUser ? 'bg-blue-600 rounded-tr-sm' : 'bg-neutral-800/80 rounded-tl-sm border border-neutral-700'}`}>
          <Text className={`${isUser ? 'text-white' : 'text-neutral-200'} text-base leading-6 text-right`}>
            {item.content}
          </Text>
        </View>
        {isUser && (
          <View className="bg-blue-600 rounded-full w-10 h-10 items-center justify-center mr-3 mt-1 shadow-sm">
            <User color="#ffffff" size={20} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 30}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          className="flex-1 pt-6"
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && (
          <View className="flex-row-reverse items-start px-6 py-2 mb-4 justify-end">
            <View className="bg-neutral-800 rounded-full w-10 h-10 items-center justify-center ml-3 border border-neutral-700">
               <Bot color="#22c55e" size={20} />
            </View>
            <View className="bg-neutral-800/80 rounded-[20px] p-4 px-6 rounded-tl-sm border border-neutral-700">
               <ActivityIndicator size="small" color="#22c55e" />
            </View>
          </View>
        )}

        {/* Input Area */}
        <View className="p-4 border-t border-neutral-800/50 bg-[#09090b]">
          <View className="flex-row items-center bg-neutral-900 rounded-3xl px-2 min-h-[60px] border border-neutral-800 shadow-lg">
            <TouchableOpacity 
              onPress={handleSend}
              disabled={!input.trim() || loading}
              className={`w-12 h-12 rounded-full items-center justify-center ml-2 ${input.trim() ? 'bg-blue-600' : 'bg-neutral-800'}`}
            >
              <Send color={input.trim() ? "#ffffff" : "#52525b"} size={20} className="mr-1" />
            </TouchableOpacity>
            <TextInput
              className="flex-1 text-white text-right text-base py-3 px-4"
              placeholder="שאל את המאמן..."
              placeholderTextColor="#52525b"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
