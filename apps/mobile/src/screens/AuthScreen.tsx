import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Sign In fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [faculty, setFaculty] = useState('Faculty of Natural & Applied Sciences');
  const [regPassword, setRegPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Server settings modal
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrl, setServerUrl] = useState(api.getBaseUrl());

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your email/matriculation number and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message || 'Invalid credentials or network connection issue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !matricNumber.trim() || !regPassword.trim()) {
      Alert.alert('Required Fields', 'Please fill in all registration fields.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        matricNumber: matricNumber.trim(),
        department: department.trim(),
        faculty: faculty.trim(),
        password: regPassword,
      });
      Alert.alert('Success', 'Student account created successfully!');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not register student account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveServerUrl = async () => {
    try {
      await api.setBaseUrl(serverUrl);
      setShowServerModal(false);
      Alert.alert('Saved', `API endpoint set to: ${serverUrl}`);
    } catch {
      Alert.alert('Error', 'Could not save server endpoint.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#082B60" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Top Header & Logo */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.badgeContainer}>
              <Text style={styles.nsukBadge}>NSUK</Text>
            </View>
            <TouchableOpacity onPress={() => setShowServerModal(true)} style={styles.serverButton}>
              <Text style={styles.serverButtonText}>⚙ Server API</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.logoTitle}>LIB<Text style={styles.logoTitleCyan}>NEXA</Text></Text>
          <Text style={styles.logoSubtitle}>Digital Library Management System</Text>
          <Text style={styles.institution}>Nasarawa State University, Keffi</Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setMode('LOGIN')}
              style={[styles.tabButton, mode === 'LOGIN' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, mode === 'LOGIN' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode('REGISTER')}
              style={[styles.tabButton, mode === 'REGISTER' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, mode === 'REGISTER' && styles.tabTextActive]}>New Student</Text>
            </TouchableOpacity>
          </View>

          {mode === 'LOGIN' ? (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Email or Matriculation Number</Text>
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="matric@nsuk.edu.ng or matric"
                placeholderTextColor="#8A9BB3"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••"
                placeholderTextColor="#8A9BB3"
                secureTextEntry
              />

              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Sign In to Library Portal</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Full Legal Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Ibrahim Abubakar Musa"
                placeholderTextColor="#8A9BB3"
              />

              <Text style={styles.label}>University Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="matric@nsuk.edu.ng"
                placeholderTextColor="#8A9BB3"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Matriculation Number</Text>
              <TextInput
                style={styles.input}
                value={matricNumber}
                onChangeText={setMatricNumber}
                placeholder="NSUK/NAS/CSC/22/0142"
                placeholderTextColor="#8A9BB3"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Department</Text>
              <TextInput
                style={styles.input}
                value={department}
                onChangeText={setDepartment}
                placeholderTextColor="#8A9BB3"
              />

              <Text style={styles.label}>Faculty</Text>
              <TextInput
                style={styles.input}
                value={faculty}
                onChangeText={setFaculty}
                placeholderTextColor="#8A9BB3"
              />

              <Text style={styles.label}>Password (Min 8 Characters)</Text>
              <TextInput
                style={styles.input}
                value={regPassword}
                onChangeText={setRegPassword}
                placeholder="••••••••••••"
                placeholderTextColor="#8A9BB3"
                secureTextEntry
              />

              <TouchableOpacity
                onPress={handleRegister}
                disabled={isLoading}
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Register Student Membership</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.footerText}>
          LIBNEXA Mobile • Nasarawa State University, Keffi
        </Text>
      </ScrollView>

      {/* Server URL Config Modal */}
      <Modal visible={showServerModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend API Host</Text>
            <Text style={styles.modalSubtitle}>
              Configure the Wi-Fi IP address connecting your device to the local university API server:
            </Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://10.174.41.208:5000/api/v1"
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowServerModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveServerUrl}
                style={styles.modalSaveButton}
              >
                <Text style={styles.modalSaveText}>Save Endpoint</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#082B60',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeContainer: {
    backgroundColor: 'rgba(215, 165, 59, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D7A53B',
  },
  nsukBadge: {
    color: '#D7A53B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  serverButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  serverButtonText: {
    color: '#11C4D2',
    fontSize: 11,
    fontWeight: '600',
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  logoTitleCyan: {
    color: '#11C4D2',
  },
  logoSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '600',
    marginTop: 2,
  },
  institution: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#1268B3',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#66758A',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  formContainer: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#172438',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F5F8FC',
    borderWidth: 1,
    borderColor: '#D8E2EE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: '#172438',
  },
  submitButton: {
    backgroundColor: '#1268B3',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#1268B3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#082B60',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#66758A',
    marginBottom: 12,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#66758A',
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#079BA9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
