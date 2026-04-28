import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Waves, Bike, PersonStanding, Dumbbell, CalendarDays, X, FileText } from 'lucide-react-native';

export interface Workout {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'swim' | 'bike' | 'run' | 'strength';
  subgroup_id: string;
}

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  swim:     { label: 'שחייה',   icon: Waves,            color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  bike:     { label: 'אופניים', icon: Bike,             color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  run:      { label: 'ריצה',    icon: PersonStanding,   color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  strength: { label: 'כוח',     icon: Dumbbell,         color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
};

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
};

export function WorkoutCard({ workout }: { workout: Workout }) {
  const [modalVisible, setModalVisible] = useState(false);
  const meta = TYPE_META[workout.type] ?? TYPE_META.run;
  const IconComp = meta.icon;

  return (
    <>
      <View style={{
        backgroundColor: '#111111', borderWidth: 1, borderColor: '#262626',
        borderRadius: 14, padding: 12, marginBottom: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: meta.bg, borderWidth: 1, borderColor: meta.color,
            borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
          }}>
            <IconComp color={meta.color} size={12} />
            <Text style={{ color: meta.color, fontSize: 10, fontWeight: '700' }}>{meta.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#6b7280', fontSize: 11 }}>{fmtDate(workout.date)}</Text>
            <CalendarDays color="#6b7280" size={12} />
          </View>
        </View>

        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15, textAlign: 'right', marginBottom: 12 }}>
          {workout.title}
        </Text>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: '#1a1a1a', borderRadius: 10, paddingVertical: 8,
          }}
        >
          <FileText color="#a3a3a3" size={14} />
          <Text style={{ color: '#a3a3a3', fontSize: 12, fontWeight: '600' }}>פרטי אימון</Text>
        </TouchableOpacity>
      </View>

      {/* Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#09090b' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#262626',
          }}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
              <X color="#a3a3a3" size={24} />
            </TouchableOpacity>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: meta.bg, borderWidth: 1, borderColor: meta.color,
              borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <IconComp color={meta.color} size={14} />
              <Text style={{ color: meta.color, fontSize: 12, fontWeight: '700' }}>{meta.label}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '800', textAlign: 'right', marginBottom: 8 }}>
              {workout.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 24 }}>
              <Text style={{ color: '#6b7280', fontSize: 14 }}>{fmtDate(workout.date)}</Text>
              <CalendarDays color="#6b7280" size={14} />
            </View>

            <View style={{ backgroundColor: '#111111', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#262626' }}>
              <Text style={{ color: '#d4d4d8', fontSize: 16, lineHeight: 26, textAlign: 'right' }}>
                {workout.description}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
