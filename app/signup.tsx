import { useAuth } from '@/contexts/AuthContext';
import ErrorHandler from '@/utils/errorHandler';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, error, clearError } = useAuth();

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      clearError();
      await signUp(name.trim(), email.trim(), password);
      // Navigation will be handled by AuthProvider in _layout.tsx
    } catch (error) {
      ErrorHandler.showErrorAlert(error, 'Sign Up Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join Equinox today</Text>
        </View>

        {/* Sign Up Form */}
        <View style={styles.formContainer}>
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            autoCapitalize="words"
            autoCorrect={false}
            style={styles.input}
            contentStyle={styles.inputContent}
            outlineStyle={styles.inputOutline}
            theme={{
              colors: {
                primary: '#17bf2d',
                onSurfaceVariant: '#ffffff',
                outline: '#3a3a3e',
                surface: '#2a2a2e',
                onSurface: '#ffffff',
              }
            }}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            contentStyle={styles.inputContent}
            outlineStyle={styles.inputOutline}
            theme={{
              colors: {
                primary: '#17bf2d',
                onSurfaceVariant: '#ffffff',
                outline: '#3a3a3e',
                surface: '#2a2a2e',
                onSurface: '#ffffff',
              }
            }}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            contentStyle={styles.inputContent}
            outlineStyle={styles.inputOutline}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            theme={{
              colors: {
                primary: '#17bf2d',
                onSurfaceVariant: '#ffffff',
                outline: '#3a3a3e',
                surface: '#2a2a2e',
                onSurface: '#ffffff',
              }
            }}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            contentStyle={styles.inputContent}
            outlineStyle={styles.inputOutline}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
            theme={{
              colors: {
                primary: '#17bf2d',
                onSurfaceVariant: '#ffffff',
                outline: '#3a3a3e',
                surface: '#2a2a2e',
                onSurface: '#ffffff',
              }
            }}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleSignUp}
            loading={isLoading}
            disabled={isLoading}
            style={styles.signUpButton}
            labelStyle={styles.signUpButtonText}
            buttonColor="#17bf2d"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e22',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: '#17bf2d',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Poppins',
    opacity: 0.9,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  input: {
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    marginBottom: 16,
  },
  inputContent: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Poppins',
  },
  inputOutline: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  errorContainer: {
    backgroundColor: '#ff6b6b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffffff',
    fontFamily: 'Poppins',
    fontSize: 14,
    textAlign: 'center',
  },
  signUpButton: {
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  signUpButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loginText: {
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    fontSize: 14,
  },
  loginLink: {
    color: '#17bf2d',
    fontFamily: 'Poppins',
    fontSize: 14,
    fontWeight: '600',
  },
});
