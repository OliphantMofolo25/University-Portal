// src/screens/auth/RegisterScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, Alert, TextInput, ScrollView, Modal, FlatList,
  ActivityIndicator
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import { ActionButton } from '../../components/ActionButton';

const RegisterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [facultyModalVisible, setFacultyModalVisible] = useState(false);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', fullName: '',
    studentId: '', employeeId: '', faculty: '', department: '', phone: '',
    selectedCourses: []
  });

  const roles = [
    { id: 'student', label: 'Student', icon: 'users', desc: 'Access timetable & attendance' },
    { id: 'lecturer', label: 'Lecturer', icon: 'user-check', desc: 'Submit reports & manage classes' },
    { id: 'prl', label: 'Principal Lecturer', icon: 'award', desc: 'Review reports & monitor courses' },
    { id: 'pl', label: 'Program Leader', icon: 'briefcase', desc: 'Manage courses & lecturers' },
  ];

  const faculties = [
    { id: 'FICT', name: 'Faculty of Information Communication Technology', icon: 'cpu', depts: ['Software Engineering', 'Computer Science', 'IT', 'Data Science', 'Cyber Security', 'Multimedia', 'Web Development', 'Networking'] },
    { id: 'FAMD', name: 'Faculty of Business and Entrepreneurship', icon: 'briefcase', depts: ['Business Management', 'Accounting', 'Marketing', 'HR', 'Economics', 'Entrepreneurship'] },
  ];

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesList = [];
      coursesSnapshot.forEach(doc => {
        coursesList.push({ id: doc.id, ...doc.data() });
      });
      setCourses(coursesList);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleCourseSelection = (courseId) => {
    setForm(prev => {
      const selected = prev.selectedCourses.includes(courseId)
        ? prev.selectedCourses.filter(id => id !== courseId)
        : [...prev.selectedCourses, courseId];
      return { ...prev, selectedCourses: selected };
    });
  };

  const handleRegister = async () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select your role');
      return;
    }

    if (!form.email || !form.password || !form.fullName || !form.faculty) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    if (form.password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    
    if (selectedRole === 'student') {
      if (!form.studentId) return Alert.alert('Error', 'Student ID required');
      if (form.selectedCourses.length === 0) return Alert.alert('Error', 'Please select at least one course');
    }
    if (selectedRole !== 'student' && !form.employeeId) return Alert.alert('Error', 'Employee ID required');

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(userCred.user, { displayName: form.fullName });

      const selectedCourseDetails = courses.filter(c => form.selectedCourses.includes(c.id));

      const userData = {
        uid: userCred.user.uid, email: form.email, name: form.fullName, role: selectedRole,
        faculty: form.faculty, department: form.department, phone: form.phone,
        createdAt: new Date().toISOString(),
      };
      
      if (selectedRole === 'student') {
        userData.studentId = form.studentId;
        userData.courseIds = form.selectedCourses;
        userData.assignedCourses = selectedCourseDetails;
      } else if (selectedRole === 'lecturer') {
        userData.employeeId = form.employeeId;
        userData.courseIds = [];
        userData.assignedCourses = [];
      } else if (selectedRole === 'prl') {
        userData.employeeId = form.employeeId;
        userData.stream = form.faculty;
      } else if (selectedRole === 'pl') {
        userData.employeeId = form.employeeId;
        userData.stream = form.faculty;
      }

      await setDoc(doc(db, 'users', userCred.user.uid), userData);
      Alert.alert('Success', 'Registration successful!', [{ text: 'OK', onPress: () => navigation.replace('Login') }]);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.code === 'auth/email-already-in-use' ? 'Email already registered' : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCoursesPreview = () => {
    if (form.selectedCourses.length === 0) return null;
    const selectedDetails = courses.filter(c => form.selectedCourses.includes(c.id));
    return (
      <View style={styles.coursesPreview}>
        <Text style={styles.coursesPreviewTitle}>Selected Courses ({form.selectedCourses.length}):</Text>
        {selectedDetails.map(course => (
          <View key={course.id} style={styles.coursePreviewItem}>
            <Icon name="check-circle" size={12} color={COLORS.success} />
            <Text style={styles.coursePreviewText}>{course.name} ({course.code})</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={COLORS.navy} />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Icon name="user-plus" size={48} color={COLORS.navy} />
          </View>
          <Text style={styles.title}>Limkokwing Portal</Text>
          <Text style={styles.slogan}>Empowering Every User, Every Day</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <RoundContainer glow style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Choose Your Role</Text>
          
          <View style={styles.rolesGrid}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleCard, selectedRole === role.id && styles.selectedRoleCard]}
                onPress={() => {
                  setSelectedRole(role.id);
                  if (role.id !== 'student') {
                    setForm(prev => ({ ...prev, selectedCourses: [] }));
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.roleIcon}>
                  <Icon name={role.icon} size={32} color={selectedRole === role.id ? COLORS.navy : COLORS.textLight} />
                </View>
                <Text style={[styles.roleLabel, selectedRole === role.id && styles.selectedRoleLabel]}>
                  {role.label}
                </Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
                {selectedRole === role.id && (
                  <View style={styles.checkIcon}>
                    <Icon name="check-circle" size={20} color={COLORS.navy} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Student Registration with Course Selection */}
          {selectedRole === 'student' && (
            <>
              <Input icon="credit-card" placeholder="Student ID * (e.g., 901017001)" value={form.studentId} onChange={(v) => update('studentId', v)} />
              
              <Text style={styles.fieldLabel}>Select Courses *</Text>
              <TouchableOpacity 
                style={[styles.inputWrapper, styles.picker]} 
                onPress={() => setCourseModalVisible(true)}
              >
                <Icon name="book" size={20} color={COLORS.textLight} />
                <Text style={[styles.pickerText, form.selectedCourses.length > 0 && { color: COLORS.textDark }]}>
                  {form.selectedCourses.length > 0 ? `${form.selectedCourses.length} courses selected` : 'Select your courses'}
                </Text>
                <Icon name="chevron-down" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
              
              {getSelectedCoursesPreview()}
            </>
          )}

          {/* Lecturer Registration */}
          {selectedRole === 'lecturer' && (
            <>
              <Text style={styles.sectionSubtitle}>Lecturer Details</Text>
              <Input 
                icon="briefcase" 
                placeholder="Employee ID * (e.g., LEC001)" 
                value={form.employeeId} 
                onChange={(v) => update('employeeId', v)} 
              />
              <Text style={styles.hintText}>
                Your Employee ID will be used for identification. Courses will be assigned by Program Leader.
              </Text>
            </>
          )}

          {/* PRL Registration */}
          {selectedRole === 'prl' && (
            <>
              <Text style={styles.sectionSubtitle}>PRL Details</Text>
              <Input 
                icon="briefcase" 
                placeholder="Employee ID * (e.g., PRL001)" 
                value={form.employeeId} 
                onChange={(v) => update('employeeId', v)} 
              />
            </>
          )}

          {/* PL Registration */}
          {selectedRole === 'pl' && (
            <>
              <Text style={styles.sectionSubtitle}>Program Leader Details</Text>
              <Input 
                icon="briefcase" 
                placeholder="Employee ID * (e.g., PL001)" 
                value={form.employeeId} 
                onChange={(v) => update('employeeId', v)} 
              />
            </>
          )}

          {/* Common Fields for all roles */}
          <Input icon="user" placeholder="Full Name *" value={form.fullName} onChange={(v) => update('fullName', v)} />
          <Input icon="mail" placeholder="Email *" value={form.email} onChange={(v) => update('email', v)} keyboard="email-address" />

          <TouchableOpacity style={[styles.inputWrapper, styles.picker]} onPress={() => setFacultyModalVisible(true)}>
            <Icon name="home" size={20} color={COLORS.textLight} />
            <Text style={[styles.pickerText, form.faculty && { color: COLORS.textDark }]}>{form.faculty || 'Select Faculty *'}</Text>
            <Icon name="chevron-down" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          {form.faculty && <Input icon="folder" placeholder="Department" value={form.department} onChange={(v) => update('department', v)} />}

          <Input icon="phone" placeholder="Phone Number" value={form.phone} onChange={(v) => update('phone', v)} keyboard="phone-pad" />
          
          <Text style={styles.hintText}>Password must be at least 6 characters</Text>
          <Input icon="lock" placeholder="Password * (min 6)" value={form.password} onChange={(v) => update('password', v)} secure />
          <Input icon="lock" placeholder="Confirm Password *" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} secure />

          <ActionButton title="Register" onPress={handleRegister} loading={loading} style={styles.registerButton} />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={styles.loginLink}>Login</Text></TouchableOpacity>
          </View>
        </RoundContainer>
      </ScrollView>

      {/* Faculty Selection Modal */}
      <Modal visible={facultyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Faculty</Text>
              <TouchableOpacity onPress={() => setFacultyModalVisible(false)}><Icon name="x" size={24} color={COLORS.textLight} /></TouchableOpacity>
            </View>
            <FlatList data={faculties} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <TouchableOpacity style={styles.facultyItem} onPress={() => { update('faculty', item.name); setFacultyModalVisible(false); }}>
                <View style={[styles.facultyIcon, { backgroundColor: COLORS.navy + '10' }]}>
                  <Icon name={item.icon} size={24} color={COLORS.navy} />
                </View>
                <View style={styles.facultyInfo}>
                  <Text style={styles.facultyName}>{item.name}</Text>
                  <Text style={styles.facultyId}>{item.id}</Text>
                </View>
                {form.faculty === item.name && <Icon name="check-circle" size={20} color={COLORS.success} />}
              </TouchableOpacity>
            )} />
          </View>
        </View>
      </Modal>

      {/* Course Selection Modal */}
      <Modal visible={courseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Courses</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}><Icon name="x" size={24} color={COLORS.textLight} /></TouchableOpacity>
            </View>
            {loadingCourses ? (
              <ActivityIndicator size="large" color={COLORS.navy} style={styles.loader} />
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Choose the courses you want to enroll in</Text>
                <FlatList 
                  data={courses} 
                  keyExtractor={(item) => item.id} 
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.courseItem} 
                      onPress={() => toggleCourseSelection(item.id)}
                    >
                      <View style={[styles.courseCheckbox, form.selectedCourses.includes(item.id) && styles.courseCheckboxSelected]}>
                        {form.selectedCourses.includes(item.id) && <Icon name="check" size={14} color={COLORS.white} />}
                      </View>
                      <View style={styles.courseInfo}>
                        <Text style={styles.courseItemName}>{item.name}</Text>
                        <Text style={styles.courseItemCode}>{item.code} | {item.credits} Credits</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                />
                <ActionButton 
                  title="Done" 
                  onPress={() => setCourseModalVisible(false)} 
                  style={styles.doneButton}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const Input = ({ icon, placeholder, value, onChange, secure, keyboard }) => (
  <View style={styles.inputWrapper}>
    <Icon name={icon} size={20} color={COLORS.textLight} style={styles.inputIcon} />
    <TextInput 
      style={styles.input} 
      placeholder={placeholder} 
      placeholderTextColor={COLORS.textLight} 
      value={value} 
      onChangeText={onChange} 
      secureTextEntry={secure} 
      keyboardType={keyboard} 
      autoCapitalize="none" 
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { alignItems: 'center', marginTop: 30, marginBottom: 20 },
  backButton: { position: 'absolute', left: 20, top: 0, padding: 8 },
  logoContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.navy + '10', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.navy, marginBottom: 6, letterSpacing: 1 },
  slogan: { fontSize: 12, fontWeight: '500', color: COLORS.textLight, marginBottom: 12, fontStyle: 'italic', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  formContainer: { marginHorizontal: 20, paddingHorizontal: 20, paddingVertical: 24, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.navy, marginBottom: 20, textAlign: 'center' },
  sectionSubtitle: { fontSize: 16, fontWeight: '600', color: COLORS.navy, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textDark, marginBottom: 6, marginTop: 8 },
  
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  roleCard: { width: '47%', backgroundColor: COLORS.white, borderRadius: 20, padding: 16, borderWidth: 2, borderColor: COLORS.border, position: 'relative' },
  selectedRoleCard: { borderColor: COLORS.navy, backgroundColor: COLORS.navy + '05' },
  roleIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.navy + '10', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  roleLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  selectedRoleLabel: { color: COLORS.navy },
  roleDesc: { fontSize: 11, color: COLORS.textLight, lineHeight: 14 },
  checkIcon: { position: 'absolute', top: 12, right: 12 },
  
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 40, paddingHorizontal: 16, marginBottom: 14, height: 54 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: COLORS.textDark },
  picker: { justifyContent: 'space-between' },
  pickerText: { flex: 1, fontSize: 15, color: COLORS.textLight },
  
  coursesPreview: { backgroundColor: COLORS.navy + '08', padding: 12, borderRadius: 12, marginBottom: 12 },
  coursesPreviewTitle: { fontSize: 13, fontWeight: '600', color: COLORS.navy, marginBottom: 8 },
  coursePreviewItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  coursePreviewText: { fontSize: 12, color: COLORS.textDark },
  
  hintText: { fontSize: 11, color: COLORS.textLight, marginTop: -8, marginBottom: 12 },
  registerButton: { marginTop: 10, marginBottom: 20 },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 14, color: COLORS.textLight },
  loginLink: { fontSize: 14, fontWeight: '600', color: COLORS.navy },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 28, width: '90%', maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  modalSubtitle: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  
  facultyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 14 },
  facultyIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  facultyInfo: { flex: 1 },
  facultyName: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  facultyId: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  
  courseItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  courseCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.navy, justifyContent: 'center', alignItems: 'center' },
  courseCheckboxSelected: { backgroundColor: COLORS.navy },
  courseInfo: { flex: 1 },
  courseItemName: { fontSize: 15, fontWeight: '500', color: COLORS.textDark },
  courseItemCode: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  loader: { marginTop: 40 },
  doneButton: { marginTop: 16 },
});

export default RegisterScreen;