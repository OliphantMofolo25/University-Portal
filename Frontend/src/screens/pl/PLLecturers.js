// src/screens/pl/PLLecturers.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import Header from '../../components/Header';
import { db } from '../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

const PLLecturers = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lecturers, setLecturers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesList = [];
      coursesSnapshot.forEach(doc => coursesList.push({ id: doc.id, ...doc.data() }));
      setCourses(coursesList);

      const lecturersSnapshot = await getDocs(collection(db, 'users'));
      const lecturersList = [];
      lecturersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.role === 'lecturer') lecturersList.push({ id: doc.id, ...data });
      });
      setLecturers(lecturersList);

      const classesSnapshot = await getDocs(collection(db, 'classes'));
      const classesList = [];
      classesSnapshot.forEach(doc => {
        const classData = doc.data();
        const course = coursesList.find(c => c.id === classData.courseId);
        classesList.push({ id: doc.id, ...classData, courseName: course?.name, courseCode: course?.code });
      });
      setClasses(classesList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getLecturerCourses = (courseIds) => {
    if (!courseIds || courseIds.length === 0) return [];
    return courses.filter(c => courseIds.includes(c.id));
  };

  const getDayColor = (schedule) => {
    const day = schedule?.split(' ')[0];
    switch(day) {
      case 'Monday': return '#4CAF50';
      case 'Tuesday': return '#2196F3';
      case 'Wednesday': return '#FF9800';
      case 'Thursday': return '#9C27B0';
      case 'Friday': return '#795548';
      default: return COLORS.navy;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Lecturers & Classes" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        
        <Text style={styles.sectionTitle}>Lecturers</Text>
        {lecturers.map((lecturer, index) => {
          const assignedCourses = getLecturerCourses(lecturer.courseIds);
          return (
            <RoundContainer key={index} glow style={styles.lecturerCard}>
              <View style={styles.lecturerHeader}>
                <View style={styles.lecturerAvatar}><Text style={styles.lecturerInitial}>{lecturer.name?.charAt(0)}</Text></View>
                <View style={styles.lecturerInfo}>
                  <Text style={styles.lecturerName}>{lecturer.name}</Text>
                  <Text style={styles.lecturerId}>ID: {lecturer.employeeId}</Text>
                  <Text style={styles.lecturerDept}>{lecturer.department}</Text>
                </View>
              </View>
              <View style={styles.coursesSection}>
                <Text style={styles.coursesTitle}>Assigned Courses ({assignedCourses.length})</Text>
                {assignedCourses.map((course, idx) => (
                  <View key={idx} style={styles.courseItem}>
                    <Icon name="book" size={12} color={COLORS.navy} />
                    <Text style={styles.courseName}>{course.name} ({course.code})</Text>
                  </View>
                ))}
              </View>
            </RoundContainer>
          );
        })}

        <Text style={styles.sectionTitle}>Classes</Text>
        {classes.map((classItem, index) => (
          <RoundContainer key={index} glow style={styles.classCard}>
            <View style={styles.classHeader}>
              <Text style={styles.className}>{classItem.name}</Text>
              <View style={[styles.dayBadge, { backgroundColor: getDayColor(classItem.schedule) + '15' }]}>
                <Text style={[styles.dayText, { color: getDayColor(classItem.schedule) }]}>{classItem.schedule?.split(' ')[0]}</Text>
              </View>
            </View>
            <Text style={styles.classCourse}>Course: {classItem.courseName} ({classItem.courseCode})</Text>
            <View style={styles.classDetails}>
              <View style={styles.detailItem}><Icon name="clock" size={14} color={COLORS.textLight} /><Text style={styles.detailText}>{classItem.schedule}</Text></View>
              <View style={styles.detailItem}><Icon name="map-pin" size={14} color={COLORS.textLight} /><Text style={styles.detailText}>{classItem.room}</Text></View>
            </View>
            <View style={styles.classFooter}><Icon name="users" size={12} color={COLORS.textLight} /><Text style={styles.classStats}>{classItem.enrolledStudents || 0} students enrolled</Text></View>
          </RoundContainer>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textLight },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy, marginBottom: 12, marginTop: 8 },
  lecturerCard: { marginBottom: 12 },
  lecturerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  lecturerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.navy + '15', justifyContent: 'center', alignItems: 'center' },
  lecturerInitial: { fontSize: 20, fontWeight: '600', color: COLORS.navy },
  lecturerInfo: { flex: 1 },
  lecturerName: { fontSize: 16, fontWeight: '600', color: COLORS.navy },
  lecturerId: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  lecturerDept: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  coursesSection: { paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  coursesTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  courseItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  courseName: { fontSize: 12, color: COLORS.textLight },
  classCard: { marginBottom: 12 },
  classHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  className: { fontSize: 16, fontWeight: '600', color: COLORS.navy, flex: 1 },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dayText: { fontSize: 11, fontWeight: '500' },
  classCourse: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  classDetails: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: COLORS.textLight },
  classFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  classStats: { fontSize: 11, color: COLORS.textLight },
});

export default PLLecturers;