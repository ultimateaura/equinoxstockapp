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

export default function EditProfileScreen() {
  const { user, userProfile, updateUserProfile, loading, error, clearError } = useAuth();
  const [name, setName] = useState(userProfile?.name || user?.displayName || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setIsLoading(true);
      clearError();
      await updateUserProfile(name.trim());
      ErrorHandler.showSuccessAlert('Profile updated successfully!', 'Success');
      router.back();
    } catch (error) {
      ErrorHandler.showErrorAlert(error, 'Update Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleChangeAvatar = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose how you want to update your profile picture',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => Alert.alert('Camera', 'Camera functionality coming soon!') },
        { text: 'Choose from Gallery', onPress: () => Alert.alert('Gallery', 'Gallery functionality coming soon!') },
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Text style={styles.headerSubtitle}>Update your information</Text>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.profilePictureButton} onPress={handleChangeAvatar}>
            <View style={styles.profilePicture}>
              <Text style={styles.profilePictureText}>
                {name ? name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.editIcon}>
              <MaterialCommunityIcons name="camera" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileLabel}>Profile Picture</Text>
        </View>

        {/* Edit Form */}
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
            value={userProfile?.email || user?.email || ''}
            mode="outlined"
            editable={false}
            style={styles.input}
            contentStyle={[styles.inputContent, styles.disabledInput]}
            outlineStyle={styles.inputOutline}
            theme={{
              colors: {
                primary: '#17bf2d',
                onSurfaceVariant: '#b8b8d2',
                outline: '#3a3a3e',
                surface: '#2a2a2e',
                onSurface: '#b8b8d2',
              }
            }}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.cancelButton}
              labelStyle={styles.cancelButtonText}
              buttonColor="transparent"
            >
              Cancel
            </Button>

            <Button
              mode="contained"
              onPress={handleSave}
              loading={isLoading}
              disabled={isLoading}
              style={styles.saveButton}
              labelStyle={styles.saveButtonText}
              buttonColor="#17bf2d"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#17bf2d',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Poppins',
    opacity: 0.9,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#1e1e22',
  },
  profilePictureButton: {
    position: 'relative',
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#17bf2d',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profilePictureText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#17bf2d',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileLabel: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginTop: 12,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
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
  disabledInput: {
    color: '#b8b8d2',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 8,
    borderColor: '#3a3a3e',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins',
    color: '#b8b8d2',
  },
  saveButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins',
    fontWeight: '600',
  },
});
