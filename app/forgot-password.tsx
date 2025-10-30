import { useAuth } from '@/contexts/AuthContext';
import ErrorHandler from '@/utils/errorHandler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword, error, clearError } = useAuth();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      clearError();
      await resetPassword(email.trim());
      setEmailSent(true);
    } catch (error) {
      ErrorHandler.showErrorAlert(error, 'Reset Password Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Check Your Email</Text>
            <Text style={styles.headerSubtitle}>Password reset link sent</Text>
          </View>

          {/* Success Message */}
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="email-check" size={48} color="#17bf2d" />
            </View>
            <Text style={styles.successTitle}>Email Sent!</Text>
            <Text style={styles.successText}>
              We've sent a password reset link to {email}. Please check your email and follow the instructions to reset your password.
            </Text>
            <Text style={styles.successSubtext}>
              Didn't receive the email? Check your spam folder or try again.
            </Text>
          </View>

          {/* Back to Login Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleBackToLogin}
              style={styles.backButton}
              labelStyle={styles.backButtonText}
              buttonColor="#17bf2d"
            >
              Back to Login
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToLogin} style={styles.backButtonHeader}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <Text style={styles.headerSubtitle}>Enter your email to reset</Text>
        </View>

        {/* Reset Form */}
        <View style={styles.formContainer}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock-reset" size={64} color="#17bf2d" />
          </View>

          <Text style={styles.instructionText}>
            Enter the email address associated with your account and we'll send you a link to reset your password.
          </Text>

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

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleResetPassword}
            loading={isLoading}
            disabled={isLoading}
            style={styles.resetButton}
            labelStyle={styles.resetButtonText}
            buttonColor="#17bf2d"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </View>

        {/* Back to Login Link */}
        <View style={styles.backContainer}>
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={styles.backText}>Back to Login</Text>
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
    position: 'relative',
  },
  backButtonHeader: {
    position: 'absolute',
    left: 20,
    top: 80,
    padding: 8,
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
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  instructionText: {
    fontSize: 16,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
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
    width: '100%',
  },
  errorText: {
    color: '#ffffff',
    fontFamily: 'Poppins',
    fontSize: 14,
    textAlign: 'center',
  },
  resetButton: {
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
    width: '100%',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
  },
  backContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backText: {
    color: '#17bf2d',
    fontFamily: 'Poppins',
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  successSubtext: {
    fontSize: 14,
    color: '#b8b8d2',
    fontFamily: 'Poppins',
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    borderRadius: 8,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
  },
});
