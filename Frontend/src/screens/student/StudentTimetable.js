// src/screens/student/StudentTimetable.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import Header from '../../components/Header';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const StudentTimetable = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [schedule, setSchedule] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const days = [
    { id: 'monday', label: 'Monday', icon: 'calendar' },
    { id: 'tuesday', label: 'Tuesday', icon: 'calendar' },
    { id: 'wednesday', label: 'Wednesday', icon: 'calendar' },
    { id: 'thursday', label: 'Thursday', icon: 'calendar' },
    { id: 'friday', label: 'Friday', icon: 'calendar' },
  ];

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const scheduleData = {};
      
      // Fetch schedule for each day
      for (const day of days) {
        const scheduleQuery = query(
          collection(db, 'schedule'),
          where('day', '==', day.label)
        );
        const scheduleSnapshot = await getDocs(scheduleQuery);
        const daySchedule = [];
        scheduleSnapshot.forEach(doc => {
          daySchedule.push({ id: doc.id, ...doc.data() });
        });
        // Sort by time
        daySchedule.sort((a, b) => a.time.localeCompare(b.time));
        scheduleData[day.id] = daySchedule;
      }
      
      setSchedule(scheduleData);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedule();
    setRefreshing(false);
  };

  const currentSchedule = schedule[selectedDay] || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading timetable...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="My Timetable" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.daySelector}>
          {days.map(day => (
            <TouchableOpacity
              key={day.id}
              style={[
                styles.dayButton,
                selectedDay === day.id && styles.activeDayButton
              ]}
              onPress={() => setSelectedDay(day.id)}
            >
              <Icon 
                name={day.icon} 
                size={16} 
                color={selectedDay === day.id ? COLORS.white : COLORS.navy} 
              />
              <Text style={[
                styles.dayButtonText,
                selectedDay === day.id && styles.activeDayButtonText
              ]}>
                {day.label.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} Schedule
        </Text>

        {currentSchedule.length === 0 ? (
          <RoundContainer glow style={styles.emptyCard}>
            <Icon name="calendar" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No classes scheduled</Text>
            <Text style={styles.emptySubtext}>No classes found for {selectedDay}</Text>
          </RoundContainer>
        ) : (
          currentSchedule.map((item, index) => (
            <RoundContainer key={index} glow style={styles.classCard}>
              <View style={styles.timeBadge}>
                <Icon name="clock" size={14} color={COLORS.white} />
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
              <Text style={styles.courseName}>{item.courseName}</Text>
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Icon name="user" size={14} color={COLORS.textLight} />
                  <Text style={styles.detailText}>{item.lecturerName}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Icon name="map-pin" size={14} color={COLORS.textLight} />
                  <Text style={styles.detailText}>{item.room}</Text>
                </View>
              </View>
            </RoundContainer>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: COLORS.navy + '08',
    borderRadius: 30,
    padding: 4,
  },
  dayButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 26,
  },
  activeDayButton: {
    backgroundColor: COLORS.navy,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.navy,
  },
  activeDayButtonText: {
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 16,
  },
  classCard: {
    marginBottom: 12,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.white,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.textLight,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
});

export default StudentTimetable;