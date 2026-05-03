// src/screens/pl/PLClasses.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import { ActionButton } from '../../components/ActionButton';
import Header from '../../components/Header';
import { db, auth } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

const PLClasses = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [venueModalVisible, setVenueModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    schedule: '',
    room: '',
    lecturerId: '',
    enrolledStudents: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Predefined options
  const venues = ['MM1', 'MM2', 'MM3', 'MM4', 'MM5', 'MM6', 'MM7', 'Net Lab', 'Hall 1', 'Hall 2', 'Hall 3', 'Hall 4', 'Hall 5', 'Hall 6', 'Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5', 'Workshop'];
  
  const timeSlots = [
    { label: 'Monday 08:30-10:30', value: 'Monday 08:30-10:30', day: 'Monday' },
    { label: 'Monday 10:30-12:30', value: 'Monday 10:30-12:30', day: 'Monday' },
    { label: 'Monday 12:30-14:30', value: 'Monday 12:30-14:30', day: 'Monday' },
    { label: 'Monday 14:30-16:30', value: 'Monday 14:30-16:30', day: 'Monday' },
    { label: 'Tuesday 08:30-10:30', value: 'Tuesday 08:30-10:30', day: 'Tuesday' },
    { label: 'Tuesday 10:30-12:30', value: 'Tuesday 10:30-12:30', day: 'Tuesday' },
    { label: 'Tuesday 12:30-14:30', value: 'Tuesday 12:30-14:30', day: 'Tuesday' },
    { label: 'Tuesday 14:30-16:30', value: 'Tuesday 14:30-16:30', day: 'Tuesday' },
    { label: 'Wednesday 08:30-10:30', value: 'Wednesday 08:30-10:30', day: 'Wednesday' },
    { label: 'Wednesday 10:30-12:30', value: 'Wednesday 10:30-12:30', day: 'Wednesday' },
    { label: 'Wednesday 12:30-14:30', value: 'Wednesday 12:30-14:30', day: 'Wednesday' },
    { label: 'Wednesday 14:30-16:30', value: 'Wednesday 14:30-16:30', day: 'Wednesday' },
    { label: 'Thursday 08:30-10:30', value: 'Thursday 08:30-10:30', day: 'Thursday' },
    { label: 'Thursday 10:30-12:30', value: 'Thursday 10:30-12:30', day: 'Thursday' },
    { label: 'Thursday 12:30-14:30', value: 'Thursday 12:30-14:30', day: 'Thursday' },
    { label: 'Thursday 14:30-16:30', value: 'Thursday 14:30-16:30', day: 'Thursday' },
    { label: 'Friday 08:30-10:30', value: 'Friday 08:30-10:30', day: 'Friday' },
    { label: 'Friday 10:30-12:30', value: 'Friday 10:30-12:30', day: 'Friday' },
    { label: 'Friday 12:30-14:30', value: 'Friday 12:30-14:30', day: 'Friday' },
    { label: 'Friday 14:30-16:30', value: 'Friday 14:30-16:30', day: 'Friday' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch all courses
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesList = [];
      coursesSnapshot.forEach(doc => {
        coursesList.push({ id: doc.id, ...doc.data() });
      });
      setCourses(coursesList);

      // Fetch all lecturers
      const lecturersQuery = query(collection(db, 'users'), where('role', '==', 'lecturer'));
      const lecturersSnapshot = await getDocs(lecturersQuery);
      const lecturersList = [];
      lecturersSnapshot.forEach(doc => {
        lecturersList.push({ id: doc.id, name: doc.data().name, employeeId: doc.data().employeeId });
      });
      setLecturers(lecturersList);

      // Fetch all classes with course names
      const classesSnapshot = await getDocs(collection(db, 'classes'));
      const classesList = [];
      for (const doc of classesSnapshot.docs) {
        const classData = doc.data();
        const course = coursesList.find(c => c.id === classData.courseId);
        classesList.push({
          id: doc.id,
          ...classData,
          courseName: course?.name,
          courseCode: course?.code,
        });
      }
      setClasses(classesList);
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      courseId: '',
      schedule: '',
      room: '',
      lecturerId: '',
      enrolledStudents: '',
    });
    setEditingClass(null);
  };

  const handleAddClass = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name || '',
      courseId: classItem.courseId || '',
      schedule: classItem.schedule || '',
      room: classItem.room || '',
      lecturerId: classItem.lecturerId || '',
      enrolledStudents: classItem.enrolledStudents ? String(classItem.enrolledStudents) : '',
    });
    setModalVisible(true);
  };

  const handleSaveClass = async () => {
    if (!formData.name || !formData.courseId || !formData.schedule || !formData.room) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const classData = {
        name: formData.name,
        courseId: formData.courseId,
        schedule: formData.schedule,
        room: formData.room,
        lecturerId: formData.lecturerId || '',
        enrolledStudents: parseInt(formData.enrolledStudents) || 0,
        updatedAt: new Date().toISOString(),
      };

      if (editingClass) {
        await updateDoc(doc(db, 'classes', editingClass.id), classData);
        Alert.alert('Success', 'Class updated successfully');
      } else {
        classData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'classes'), classData);
        Alert.alert('Success', 'Class added successfully');
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving class:', error);
      Alert.alert('Error', 'Failed to save class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (classItem) => {
    Alert.alert(
      'Confirm Delete',
      `Delete "${classItem.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'classes', classItem.id));
              Alert.alert('Success', 'Class deleted');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete class');
            }
          },
        },
      ]
    );
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

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? `${course.name} (${course.code})` : 'Select a course';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Class Management" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
          <Icon name="plus" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add New Class</Text>
        </TouchableOpacity>

        {classes.length === 0 ? (
          <RoundContainer glow style={styles.emptyContainer}>
            <Icon name="calendar" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No classes found</Text>
            <Text style={styles.emptySubtext}>Tap "Add New Class" to create one</Text>
          </RoundContainer>
        ) : (
          classes.map((classItem, index) => (
            <RoundContainer key={index} glow style={styles.classCard}>
              <View style={styles.classHeader}>
                <Text style={styles.className}>{classItem.name}</Text>
                <View style={[styles.dayBadge, { backgroundColor: getDayColor(classItem.schedule) + '15' }]}>
                  <Text style={[styles.dayText, { color: getDayColor(classItem.schedule) }]}>
                    {classItem.schedule?.split(' ')[0]}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.classCourse}>
                Course: {getCourseName(classItem.courseId)}
              </Text>
              
              <View style={styles.classDetails}>
                <View style={styles.detailItem}>
                  <Icon name="clock" size={14} color={COLORS.textLight} />
                  <Text style={styles.detailText}>{classItem.schedule}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Icon name="map-pin" size={14} color={COLORS.textLight} />
                  <Text style={styles.detailText}>{classItem.room}</Text>
                </View>
              </View>
              
              {classItem.lecturerId && (
                <View style={styles.lecturerInfo}>
                  <Icon name="user" size={12} color={COLORS.textLight} />
                  <Text style={styles.lecturerText}>
                    Lecturer: {lecturers.find(l => l.id === classItem.lecturerId)?.name || 'Not assigned'}
                  </Text>
                </View>
              )}
              
              <View style={styles.classFooter}>
                <Icon name="users" size={12} color={COLORS.textLight} />
                <Text style={styles.classStats}>{classItem.enrolledStudents || 0} students enrolled</Text>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.editButton} onPress={() => handleEditClass(classItem)}>
                  <Icon name="edit-2" size={16} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteClass(classItem)}>
                  <Icon name="trash-2" size={16} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </RoundContainer>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Class Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingClass ? 'Edit' : 'Add'} Class</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="x" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <TextInput
                style={styles.input}
                placeholder="Class Name * (e.g., Programming 1 - Group A)"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
              
              <Text style={styles.label}>Select Course *</Text>
              <View style={styles.optionsGrid}>
                {courses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.optionChip, formData.courseId === course.id && styles.optionChipSelected]}
                    onPress={() => setFormData({ ...formData, courseId: course.id })}
                  >
                    <Text style={[styles.optionChipText, formData.courseId === course.id && styles.optionChipTextSelected]}>
                      {course.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.label}>Select Schedule *</Text>
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setScheduleModalVisible(true)}
              >
                <Text style={[styles.pickerButtonText, formData.schedule && { color: COLORS.textDark }]}>
                  {formData.schedule || 'Choose time slot'}
                </Text>
                <Icon name="chevron-down" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
              
              <Text style={styles.label}>Select Venue *</Text>
              <TouchableOpacity 
                style={styles.pickerButton} 
                onPress={() => setVenueModalVisible(true)}
              >
                <Text style={[styles.pickerButtonText, formData.room && { color: COLORS.textDark }]}>
                  {formData.room || 'Choose venue'}
                </Text>
                <Icon name="chevron-down" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
              
              <Text style={styles.label}>Select Lecturer (Optional)</Text>
              <View style={styles.optionsGrid}>
                <TouchableOpacity
                  style={[styles.optionChip, formData.lecturerId === '' && styles.optionChipSelected]}
                  onPress={() => setFormData({ ...formData, lecturerId: '' })}
                >
                  <Text style={[styles.optionChipText, formData.lecturerId === '' && styles.optionChipTextSelected]}>
                    None
                  </Text>
                </TouchableOpacity>
                {lecturers.map((lecturer) => (
                  <TouchableOpacity
                    key={lecturer.id}
                    style={[styles.optionChip, formData.lecturerId === lecturer.id && styles.optionChipSelected]}
                    onPress={() => setFormData({ ...formData, lecturerId: lecturer.id })}
                  >
                    <Text style={[styles.optionChipText, formData.lecturerId === lecturer.id && styles.optionChipTextSelected]}>
                      {lecturer.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TextInput
                style={styles.input}
                placeholder="Enrolled Students Count"
                keyboardType="numeric"
                value={formData.enrolledStudents}
                onChangeText={(text) => setFormData({ ...formData, enrolledStudents: text })}
              />
            </ScrollView>
            
            <ActionButton
              title={editingClass ? 'Update' : 'Save'}
              onPress={handleSaveClass}
              loading={submitting}
              style={styles.saveButton}
            />
          </View>
        </View>
      </Modal>

      {/* Venue Selection Modal */}
      <Modal visible={venueModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Venue</Text>
              <TouchableOpacity onPress={() => setVenueModalVisible(false)}>
                <Icon name="x" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={venues}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, formData.room === item && styles.modalOptionSelected]}
                  onPress={() => {
                    setFormData({ ...formData, room: item });
                    setVenueModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, formData.room === item && styles.modalOptionTextSelected]}>
                    {item}
                  </Text>
                  {formData.room === item && <Icon name="check" size={16} color={COLORS.navy} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Schedule Selection Modal */}
      <Modal visible={scheduleModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Schedule</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                <Icon name="x" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={timeSlots}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, formData.schedule === item.value && styles.modalOptionSelected]}
                  onPress={() => {
                    setFormData({ ...formData, schedule: item.value });
                    setScheduleModalVisible(false);
                  }}
                >
                  <View>
                    <Text style={[styles.modalOptionText, formData.schedule === item.value && styles.modalOptionTextSelected]}>
                      {item.label}
                    </Text>
                  </View>
                  {formData.schedule === item.value && <Icon name="check" size={16} color={COLORS.navy} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textLight },
  
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.navy, paddingVertical: 12, borderRadius: 12, marginTop: 16, marginBottom: 20 },
  addButtonText: { color: COLORS.white, fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 60, marginTop: 20 },
  emptyText: { fontSize: 18, fontWeight: '500', color: COLORS.textLight, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: COLORS.textLight, marginTop: 8 },
  
  classCard: { marginBottom: 12 },
  classHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  className: { fontSize: 16, fontWeight: '600', color: COLORS.navy, flex: 1 },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dayText: { fontSize: 11, fontWeight: '500' },
  classCourse: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  classDetails: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: COLORS.textLight },
  lecturerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  lecturerText: { fontSize: 11, color: COLORS.textLight },
  classFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  classStats: { fontSize: 11, color: COLORS.textLight },
  
  actionButtons: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  editButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.navy, paddingVertical: 8, borderRadius: 8 },
  deleteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.danger, paddingVertical: 8, borderRadius: 8 },
  actionButtonText: { fontSize: 13, fontWeight: '500', color: COLORS.white },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 28, width: '90%', maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.textDark, marginBottom: 8, marginTop: 8 },
  
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionChip: { backgroundColor: COLORS.navy + '10', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  optionChipSelected: { backgroundColor: COLORS.navy },
  optionChipText: { fontSize: 13, color: COLORS.textDark },
  optionChipTextSelected: { color: COLORS.white },
  
  pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  pickerButtonText: { fontSize: 14, color: COLORS.textLight, flex: 1 },
  
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalOptionSelected: { backgroundColor: COLORS.navy + '05' },
  modalOptionText: { fontSize: 15, color: COLORS.textDark },
  modalOptionTextSelected: { color: COLORS.navy, fontWeight: '500' },
  
  saveButton: { marginTop: 16 },
});

export default PLClasses;