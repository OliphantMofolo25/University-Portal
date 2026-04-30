// src/screens/pl/PLCourses.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import { ActionButton } from '../../components/ActionButton';
import Header from '../../components/Header';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const PLCourses = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', faculty: '', department: '', credits: '' });
  const [submitting, setSubmitting] = useState(false);

  const faculties = ['Faculty of Information Communication Technology', 'Faculty of Business and Entrepreneurship'];

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

  const handleSaveCourse = async () => {
    if (!formData.name || !formData.code || !formData.faculty) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), formData);
        Alert.alert('Success', 'Course updated');
      } else {
        await addDoc(collection(db, 'courses'), formData);
        Alert.alert('Success', 'Course added');
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (course) => {
    Alert.alert('Confirm Delete', `Delete ${course.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteDoc(doc(db, 'courses', course.id));
        loadData();
      }},
    ]);
  };

  const handleAssignLecturer = async () => {
    if (!selectedCourse || !selectedLecturer) {
      Alert.alert('Error', 'Please select course and lecturer');
      return;
    }
    setSubmitting(true);
    try {
      const currentCourses = selectedLecturer.courseIds || [];
      if (!currentCourses.includes(selectedCourse.id)) {
        await updateDoc(doc(db, 'users', selectedLecturer.id), {
          courseIds: [...currentCourses, selectedCourse.id],
          assignedCourses: [...(selectedLecturer.assignedCourses || []), { id: selectedCourse.id, name: selectedCourse.name, code: selectedCourse.code }]
        });
        Alert.alert('Success', `Course assigned to ${selectedLecturer.name}`);
      } else {
        Alert.alert('Info', 'Lecturer already assigned to this course');
      }
      setAssignModalVisible(false);
      setSelectedCourse(null);
      setSelectedLecturer(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to assign course');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingCourse(null);
    setFormData({ name: '', code: '', faculty: '', department: '', credits: '' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.navy} />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Course Management" navigation={navigation} showBack={true} showLogout={true} />
      
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)}>
            <Icon name="plus" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Add Course</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.assignButton]} onPress={() => setAssignModalVisible(true)}>
            <Icon name="user-plus" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Assign Lecturer</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>All Courses</Text>
        {courses.map((course, index) => (
          <RoundContainer key={index} glow style={styles.courseCard}>
            <View style={styles.courseHeader}>
              <View><Text style={styles.courseName}>{course.name}</Text><Text style={styles.courseCode}>{course.code}</Text></View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => { setEditingCourse(course); setFormData(course); setModalVisible(true); }}>
                  <Icon name="edit-2" size={18} color={COLORS.navy} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteCourse(course)}>
                  <Icon name="trash-2" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.courseFaculty}>Faculty: {course.faculty}</Text>
            <Text style={styles.courseCredits}>Credits: {course.credits || 'N/A'}</Text>
          </RoundContainer>
        ))}
      </ScrollView>

      {/* Add/Edit Course Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCourse ? 'Edit' : 'Add'} Course</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Icon name="x" size={24} color={COLORS.textLight} /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Course Name *" value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} />
            <TextInput style={styles.input} placeholder="Course Code *" value={formData.code} onChangeText={(text) => setFormData({ ...formData, code: text })} />
            <TextInput style={styles.input} placeholder="Department" value={formData.department} onChangeText={(text) => setFormData({ ...formData, department: text })} />
            <TextInput style={styles.input} placeholder="Credits" keyboardType="numeric" value={formData.credits} onChangeText={(text) => setFormData({ ...formData, credits: text })} />
            <Text style={styles.label}>Faculty *</Text>
            <View style={styles.facultyPicker}>
              {faculties.map((faculty) => (
                <TouchableOpacity key={faculty} style={[styles.facultyOption, formData.faculty === faculty && styles.facultyOptionSelected]} onPress={() => setFormData({ ...formData, faculty })}>
                  <Text style={[styles.facultyOptionText, formData.faculty === faculty && styles.facultyOptionTextSelected]}>{faculty}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ActionButton title={editingCourse ? 'Update' : 'Save'} onPress={handleSaveCourse} loading={submitting} />
          </View>
        </View>
      </Modal>

      {/* Assign Lecturer Modal */}
      <Modal visible={assignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Lecturer to Course</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}><Icon name="x" size={24} color={COLORS.textLight} /></TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Select Course</Text>
            <ScrollView style={styles.pickerList}>
              {courses.map((course) => (
                <TouchableOpacity key={course.id} style={[styles.pickerOption, selectedCourse?.id === course.id && styles.pickerOptionSelected]} onPress={() => setSelectedCourse(course)}>
                  <Text style={[styles.pickerOptionText, selectedCourse?.id === course.id && styles.pickerOptionTextSelected]}>{course.name} ({course.code})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Select Lecturer</Text>
            <ScrollView style={styles.pickerList}>
              {lecturers.map((lecturer) => (
                <TouchableOpacity key={lecturer.id} style={[styles.pickerOption, selectedLecturer?.id === lecturer.id && styles.pickerOptionSelected]} onPress={() => setSelectedLecturer(lecturer)}>
                  <Text style={[styles.pickerOptionText, selectedLecturer?.id === lecturer.id && styles.pickerOptionTextSelected]}>{lecturer.name} ({lecturer.employeeId})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ActionButton title="Assign" onPress={handleAssignLecturer} loading={submitting} />
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
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 20 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.navy, paddingVertical: 12, borderRadius: 12 },
  assignButton: { backgroundColor: '#2A3D6B' },
  actionButtonText: { color: COLORS.white, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.navy, marginBottom: 12 },
  courseCard: { marginBottom: 12 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  courseName: { fontSize: 16, fontWeight: '600', color: COLORS.navy },
  courseCode: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 16 },
  courseFaculty: { fontSize: 13, color: COLORS.textLight, marginBottom: 4 },
  courseCredits: { fontSize: 13, color: COLORS.textLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 28, width: '90%', maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  modalLabel: { fontSize: 14, fontWeight: '500', color: COLORS.textDark, marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.textDark, marginBottom: 8 },
  facultyPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  facultyOption: { backgroundColor: COLORS.navy + '10', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  facultyOptionSelected: { backgroundColor: COLORS.navy },
  facultyOptionText: { fontSize: 13, color: COLORS.textDark },
  facultyOptionTextSelected: { color: COLORS.white },
  pickerList: { maxHeight: 150 },
  pickerOption: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerOptionSelected: { backgroundColor: COLORS.navy + '10' },
  pickerOptionText: { fontSize: 14, color: COLORS.textDark },
  pickerOptionTextSelected: { color: COLORS.navy, fontWeight: '500' },
});

export default PLCourses;