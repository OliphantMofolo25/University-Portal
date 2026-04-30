// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS } from '../../styles/colors';
import { RoundContainer } from '../../components/RoundContainer';
import { ActionButton } from '../../components/ActionButton';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedRoleLabel, setSelectedRoleLabel] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'student', label: 'Student', icon: 'users' },
    { id: 'lecturer', label: 'Lecturer', icon: 'user-check' },
    { id: 'prl', label: 'Principal Lecturer', icon: 'award' },
    { id: 'pl', label: 'Program Leader', icon: 'briefcase' },
  ];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (!selectedRole) {
      Alert.alert('Error', 'Please select your role');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();

      if (!userData) {
        Alert.alert('Error', 'User data not found');
        setLoading(false);
        return;
      }

      if (userData?.role !== selectedRole) {
        Alert.alert('Error', `You are registered as a ${userData?.role}. Please select the correct role.`);
        setLoading(false);
        return;
      }

      // No navigation needed - authentication state change in App.js will handle it
      // The onAuthStateChanged listener will automatically show the correct main screen
      
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please register.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Wrong password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role) => {
    setSelectedRole(role.id);
    setSelectedRoleLabel(role.label);
    setDropdownVisible(false);
  };

  const getSelectedRoleIcon = () => {
    const role = roles.find(r => r.id === selectedRole);
    return role ? role.icon : 'users';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="monitor" size={48} color={COLORS.white} />
          </View>
          <Text style={styles.title}>Academic Monitor</Text>
          <Text style={styles.subtitle}>Login to your account</Text>
        </View>

        <RoundContainer glow style={styles.formContainer}>
          <Text style={styles.dropdownLabel}>Select Role</Text>
          <TouchableOpacity 
            style={styles.dropdownButton} 
            onPress={() => setDropdownVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownLeft}>
              <Icon name={getSelectedRoleIcon()} size={20} color={selectedRole ? COLORS.navy : COLORS.textLight} />
              <Text style={[styles.dropdownText, selectedRole && { color: COLORS.navy, fontWeight: '500' }]}>
                {selectedRoleLabel || 'Choose your role'}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <Icon name="mail" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Icon name="lock" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <ActionButton
            title="Login"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </RoundContainer>
      </ScrollView>

      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownModal}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.dropdownItem,
                  selectedRole === role.id && styles.dropdownItemSelected
                ]}
                onPress={() => selectRole(role)}
              >
                <View style={[styles.dropdownItemIcon, selectedRole === role.id && { backgroundColor: COLORS.navy + '15' }]}>
                  <Icon name={role.icon} size={20} color={selectedRole === role.id ? COLORS.navy : COLORS.textLight} />
                </View>
                <Text style={[styles.dropdownItemText, selectedRole === role.id && { color: COLORS.navy, fontWeight: '600' }]}>
                  {role.label}
                </Text>
                {selectedRole === role.id && (
                  <Icon name="check" size={16} color={COLORS.navy} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 30 },
  logoContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.navy, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  formContainer: { marginHorizontal: 20, paddingHorizontal: 20, paddingVertical: 24, marginBottom: 30 },
  dropdownLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textDark, marginBottom: 8 },
  dropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, borderRadius: 40, paddingHorizontal: 16, marginBottom: 16, height: 54, backgroundColor: COLORS.white },
  dropdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dropdownText: { fontSize: 15, color: COLORS.textLight },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 40, paddingHorizontal: 16, marginBottom: 16, height: 54, gap: 12 },
  input: { flex: 1, fontSize: 15, color: COLORS.textDark },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotText: { color: COLORS.navy, fontSize: 13 },
  loginButton: { marginBottom: 20 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 14, color: COLORS.textLight },
  registerLink: { fontSize: 14, fontWeight: '600', color: COLORS.navy },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownModal: { backgroundColor: COLORS.white, borderRadius: 20, width: '80%', padding: 8 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, gap: 12 },
  dropdownItemSelected: { backgroundColor: COLORS.navy + '08' },
  dropdownItemIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dropdownItemText: { flex: 1, fontSize: 15, color: COLORS.textDark },
});

export default LoginScreen;