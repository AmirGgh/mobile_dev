import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { api as supabase } from '../../../lib/api';
import { Users, ChevronLeft, Ticket, Plus, Trash2, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useLanguage } from '../../../lib/LanguageContext';

interface Subgroup {
  id: string;
  name: string;
}

export default function RosterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const { t } = useLanguage();

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Coach's group
      const { data: groupRow } = await supabase
        .from('groups').select('id').eq('head_coach_id', user.id).maybeSingle();

      if (!groupRow) {
        setSubgroups([]);
        return;
      }
      setGroupId(groupRow.id);

      // Fetch subgroups
      const { data: sgs } = await supabase
        .from('subgroups').select('id, name').eq('group_id', groupRow.id);

      setSubgroups((sgs ?? []) as Subgroup[]);

      // Fetch invite codes
      const { data: codes } = await supabase
        .from('invite_codes').select('*').eq('group_id', groupRow.id);
      setInviteCodes(codes || []);
    } catch (err) {
      console.error('[Roster] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#09090b]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#09090b]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
      >
        <Text className="text-white text-right text-base mb-6 text-neutral-400">
          {t('בחר קבוצה כדי לצפות ברשימת המתאמנים ולנהל נוכחות.', 'Select a group to view the roster and manage attendance.')}
        </Text>

        {subgroups.length === 0 ? (
          <View className="bg-[#111111] border border-neutral-800 rounded-2xl p-8 items-center mt-4">
            <Users color="#525252" size={40} />
            <Text className="text-neutral-500 text-center mt-4 font-medium">
              {t('לא נמצאו קבוצות תחת ניהולך.', 'No groups found under your management.')}
            </Text>
          </View>
        ) : (
          subgroups.map(sg => (
            <TouchableOpacity
              key={sg.id}
              activeOpacity={0.7}
              onPress={() => router.push(`/roster/${sg.id}`)}
              style={{
                backgroundColor: '#111111',
                borderWidth: 1,
                borderColor: '#262626',
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <ChevronLeft color="#52525b" size={20} />
              
              <View className="flex-row items-center gap-4">
                <Text className="text-white font-bold text-lg">{sg.name}</Text>
                <View className="w-12 h-12 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 items-center justify-center">
                  <Users color="#22c55e" size={20} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Invite Codes Section */}
        <View className="mt-10 mb-20">
          <View className="flex-row items-center justify-between mb-4 px-1">
            <TouchableOpacity 
              onPress={async () => {
                if (!groupId) return;
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                await supabase.from('invite_codes').insert({ code, group_id: groupId });
                fetchData();
              }}
              className="bg-[#22c55e]/10 px-3 py-1.5 rounded-lg border border-[#22c55e]/20"
            >
              <Text className="text-[#22c55e] font-bold text-xs">+ {t('קוד חדש', 'New Code')}</Text>
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">{t('קודי הזמנה', 'Invite Codes')}</Text>
          </View>

          {inviteCodes.length === 0 ? (
            <View className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 items-center">
              <Text className="text-neutral-500 text-sm">{t('אין קודי הזמנה פעילים', 'No active invite codes')}</Text>
            </View>
          ) : (
            inviteCodes.map(code => (
              <View key={code.code} className="bg-[#111111] border border-neutral-800 rounded-xl p-4 mb-2 flex-row items-center justify-between">
                <TouchableOpacity 
                  onPress={async () => {
                    await supabase.from('invite_codes').delete().eq('code', code.code);
                    fetchData();
                  }}
                  className="p-2"
                >
                  <Trash2 color="#ef4444" size={18} />
                </TouchableOpacity>
                
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity 
                    onPress={() => {
                      Clipboard.setStringAsync(code.code);
                      Alert.alert(t('הועתק', 'Copied'), t('קוד ההזמנה הועתק ללוח', 'Invite code copied to clipboard'));
                    }}
                    className="bg-neutral-800 px-3 py-2 rounded-lg flex-row items-center gap-2"
                  >
                    <Copy color="#a3a3a3" size={14} />
                    <Text className="text-white font-mono font-bold">{code.code}</Text>
                  </TouchableOpacity>
                  <Ticket color="#52525b" size={20} />
                </View>
              </View>
            ))
          )}
          <Text className="text-neutral-500 text-right text-xs mt-3 px-1">
            {t('שתף את הקוד עם ספורטאים כדי שיוכלו להצטרף למועדון שלך.', 'Share these codes with athletes to let them join your club.')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
