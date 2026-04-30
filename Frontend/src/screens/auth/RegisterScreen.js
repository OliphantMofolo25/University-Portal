// src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  TouchableOpacity, Alert, TextInput, ScrollView, Modal, FlatList
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import { ActionButton } from '../../components/ActionButton';

const RegisterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [facultyModalVisible, setFacultyModalVisible] = useState(false);
  const [empKeyModalVisible, setEmpKeyModalVisible] = useState(false);
  const [empKey, setEmpKey] = useState('');
  const [empKeyError, setEmpKeyError] = useState('');
  const [verifiedLecturer, setVerifiedLecturer] = useState(null);
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', fullName: '',
    studentId: '', faculty: '', department: '', phone: ''
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

  // Predefined course lists (no dependency on coursesData)
  const fictCourses = [
    { id: 'C001', name: 'Programming 1', code: 'DIPL1112' },
    { id: 'C002', name: 'Web Development', code: 'WEB201' },
    { id: 'C003', name: 'Database Systems', code: 'DB201' },
  ];

  const famdCourses = [
    { id: 'C004', name: 'Business Management', code: 'BMGT101' },
    { id: 'C005', name: 'Business Communication', code: 'COMM101' },
    { id: 'C006', name: 'Entrepreneurship', code: 'ENT101' },
  ];

  // EMP Key options with course details
  const empKeyOptions = [
    {
      id: 'ICT001',
      key: 'ICT001',
      faculty: 'FICT',
      facultyName: 'Faculty of Information Communication Technology',
      courses: fictCourses
    },
    {
      id: 'ICT002',
      key: 'ICT002',
      faculty: 'FICT',
      facultyName: 'Faculty of Information Communication Technology',
      courses: fictCourses
    },
    {
      id: 'ICT003',
      key: 'ICT003',
      faculty: 'FICT',
      facultyName: 'Faculty of Information Communication Technology',
      courses: fictCourses
    },
    {
      id: 'BUS001',
      key: 'BUS001',
      faculty: 'FAMD',
      facultyName: 'Faculty of Business and Entrepreneurship',
      courses: famdCourses
    },
    {
      id: 'BUS002',
      key: 'BUS002',
      faculty: 'FAMD',
      facultyName: 'Faculty of Business and Entrepreneurship',
      courses: famdCourses
    },
    {
      id: 'BUS003',
      key: 'BUS003',
      faculty: 'FAMD',
      facultyName: 'Faculty of Business and Entrepreneurship',
      courses: famdCourses
    },
  ];

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleEmpKeySelect = async (empOption) => {
    setEmpKey(empOption.key);
    setEmpKeyModalVisible(false);
    
    setVerifying(true);
    try {
      // Check if EMP key already exists in Firebase
      const q = query(collection(db, 'users'), where('employeeId', '==', empOption.key));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setEmpKeyError('This EMP key is already registered');
        setVerifying(false);
        return;
      }
      
      // Get faculty
      const faculty = faculties.find(f => f.id === empOption.faculty);
      
      setVerifiedLecturer({
        empKey: empOption.key,
        faculty: faculty.name,
        facultyId: empOption.faculty,
        courseIds: empOption.courses.map(c => c.id),
        courses: empOption.courses
      });
      
      // Auto-fill faculty field
      update('faculty', faculty.name);
      update('department', empOption.faculty === 'FICT' ? 'Information Technology' : 'Business Management');
      
      setEmpKeyError('');
      Alert.alert('Success', `Verified! You are assigned to ${faculty.name}\n\nYou will teach ${empOption.courses.length} courses.`);
    } catch (error) {
      console.error('Verification error:', error);
      setEmpKeyError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select your role');
      return;
    }
    
    if (selectedRole === 'lecturer' && !verifiedLecturer) {
      Alert.alert('Error', 'Please select and verify your EMP key first');
      return;
    }

    if (!form.email || !form.password || !form.fullName || !form.faculty) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    if (form.password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    
    if (selectedRole === 'student' && !form.studentId) return Alert.alert('Error', 'Student ID required');

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(userCred.user, { displayName: form.fullName });

      const userData = {
        uid: userCred.user.uid, email: form.email, name: form.fullName, role: selectedRole,
        faculty: form.faculty, department: form.department, phone: form.phone,
        createdAt: new Date().toISOString(),
      };
      
      if (selectedRole === 'student') {
        userData.studentId = form.studentId;
        // Auto-enroll students in FICT courses only
        userData.courseIds = fictCourses.map(c => c.id);
        userData.assignedCourses = fictCourses;
      } else if (selectedRole === 'lecturer' && verifiedLecturer) {
        userData.employeeId = verifiedLecturer.empKey;
        userData.courseIds = verifiedLecturer.courseIds;
        userData.assignedCourses = verifiedLecturer.courses;
      }
      
      if (selectedRole === 'prl') userData.stream = form.faculty;
      if (selectedRole === 'pl') userData.stream = form.faculty;

      await setDoc(doc(db, 'users', userCred.user.uid), userData);
      Alert.alert('Success', 'Registration successful!', [{ text: 'OK', onPress: () => navigation.replace('Login') }]);
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.code === 'auth/email-already-in-use' ? 'Email already registered' : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const getAssignedCoursesPreview = () => {
    if (!verifiedLecturer) return null;
    return (
      <View style={styles.coursesPreview}>
        <Text style={styles.coursesPreviewTitle}>Assigned Courses:</Text>
        {verifiedLecturer.courses.map(course => (
          <View key={course.id} style={styles.coursePreviewItem}>
            <Icon name="book" size={12} color={COLORS.success} />
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as a new user</Text>
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
                  if (role.id !== 'lecturer') {
                    setVerifiedLecturer(null);
                    setEmpKey('');
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

          {/* Lecturer Verification */}
          {selectedRole === 'lecturer' && (
            <>
              <Text style={styles.sectionSubtitle}>Lecturer Verification</Text>
              <Text style={styles.empHint}>Select your EMP key from the list below</Text>
              
              {/* EMP Key Dropdown Button */}
              <TouchableOpacity 
                style={[styles.inputWrapper, styles.picker]} 
                onPress={() => setEmpKeyModalVisible(true)}
              >
                <Icon name="key" size={20} color={COLORS.textLight} />
                <Text style={[styles.pickerText, empKey && { color: COLORS.textDark }]}>
                  {empKey || 'Select your EMP Key'}
                </Text>
                <Icon name="chevron-down" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
              
              {empKeyError ? <Text style={styles.errorText}>{empKeyError}</Text> : null}

              {verifiedLecturer && (
                <>
                  <View style={styles.selectedLecturerCard}>
                    <Icon name="check-circle" size={20} color={COLORS.success} />
                    <Text style={styles.selectedLecturerText}>Verified: {verifiedLecturer.empKey}</Text>
                  </View>
                  {getAssignedCoursesPreview()}
                </>
              )}
            </>
          )}

          {/* Student Registration */}
          {selectedRole === 'student' && (
            <>
              <Input icon="credit-card" placeholder="Student ID * (e.g., 901017001)" value={form.studentId} onChange={(v) => update('studentId', v)} />
              <Text style={styles.hintText}>You will be automatically enrolled in all FICT courses</Text>
            </>
          )}

          {/* Common Fields */}
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

      {/* EMP Key Selection Modal */}
      <Modal visible={empKeyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your EMP Key</Text>
              <TouchableOpacity onPress={() => setEmpKeyModalVisible(false)}><Icon name="x" size={24} color={COLORS.textLight} /></TouchableOpacity>
            </View>
            <FlatList 
              data={empKeyOptions} 
              keyExtractor={(item) => item.id} 
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.empKeyItem} 
                  onPress={() => handleEmpKeySelect(item)}
                >
                  <View style={styles.empKeyHeader}>
                    <View style={[styles.empKeyBadge, { backgroundColor: item.faculty === 'FICT' ? '#4CAF50' : '#2196F3' }]}>
                      <Text style={styles.empKeyBadgeText}>{item.key}</Text>
                    </View>
                    <Text style={styles.empKeyFaculty}>{item.facultyName}</Text>
                  </View>
                  <View style={styles.empKeyCourses}>
                    <Text style={styles.empKeyCoursesTitle}>Assigned Courses:</Text>
                    {item.courses.map((course, idx) => (
                      <View key={idx} style={styles.empKeyCourseItem}>
                        <Icon name="check-circle" size={12} color={COLORS.success} />
                        <Text style={styles.empKeyCourseText}>{course.name}</Text>
                      </View>
                    ))}
                  </View>
                  {empKey === item.key && (
                    <View style={styles.empKeySelected}>
                      <Icon name="check-circle" size={20} color={COLORS.success} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
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
  header: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  backButton: { position: 'absolute', left: 20, top: 0, padding: 8 },
  logoContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.navy + '10', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.navy, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  formContainer: { marginHorizontal: 20, paddingHorizontal: 20, paddingVertical: 24, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.navy, marginBottom: 20, textAlign: 'center' },
  sectionSubtitle: { fontSize: 16, fontWeight: '600', color: COLORS.navy, marginBottom: 12 },
  
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
  
  empHint: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  errorText: { color: COLORS.danger, fontSize: 12, marginBottom: 10 },
  selectedLecturerCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.success + '15', padding: 12, borderRadius: 12, marginBottom: 12 },
  selectedLecturerText: { fontSize: 13, color: COLORS.success, fontWeight: '500' },
  
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
  
  facultyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 14 },
  facultyIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  facultyInfo: { flex: 1 },
  facultyName: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  facultyId: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  
  empKeyItem: { 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    position: 'relative'
  },
  empKeyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  empKeyBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  empKeyBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  empKeyFaculty: { fontSize: 14, fontWeight: '500', color: COLORS.textDark, flex: 1 },
  empKeyCourses: { marginLeft: 8 },
  empKeyCoursesTitle: { fontSize: 12, fontWeight: '500', color: COLORS.textLight, marginBottom: 6 },
  empKeyCourseItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  empKeyCourseText: { fontSize: 12, color: COLORS.textDark },
  empKeySelected: { position: 'absolute', top: 16, right: 16 },
});

export default RegisterScreen;