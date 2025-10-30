import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { InvestmentPlan } from '../contexts/InvestmentPlansContext';

interface EditPlanModalProps {
  visible: boolean;
  plan: InvestmentPlan | null;
  onDismiss: () => void;
  onSave: (name: string, targetAmount: number, currentAmount: number) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const EditPlanModal: React.FC<EditPlanModalProps> = ({
  visible,
  plan,
  onDismiss,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setTargetAmount(plan.targetAmount.toString());
      setCurrentAmount(plan.currentAmount.toString());
    } else {
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
    }
  }, [plan, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a plan name');
      return;
    }

    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount);

    if (isNaN(target) || target <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    if (isNaN(current) || current < 0) {
      Alert.alert('Error', 'Please enter a valid current amount');
      return;
    }

    if (current > target) {
      Alert.alert('Error', 'Current amount cannot exceed target amount');
      return;
    }

    try {
      setSaving(true);
      await onSave(name.trim(), target, current);
      onDismiss();
    } catch (error) {
      Alert.alert('Error', 'Failed to save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;

    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${plan?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await onDelete();
              onDismiss();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete plan. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{plan ? 'Edit Plan' : 'New Plan'}</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plan Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Retirement Fund, Emergency Fund"
                placeholderTextColor="#6E7681"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Target Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="0.00"
                placeholderTextColor="#6E7681"
                keyboardType="numeric"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={currentAmount}
                onChangeText={setCurrentAmount}
                placeholder="0.00"
                placeholderTextColor="#6E7681"
                keyboardType="numeric"
                editable={!saving}
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.buttonText}>
                  {saving ? 'Saving...' : 'Save Plan'}
                </Text>
              </TouchableOpacity>

              {plan && onDelete && (
                <TouchableOpacity
                  style={[styles.button, styles.deleteButton, saving && styles.disabledButton]}
                  onPress={handleDelete}
                  disabled={saving}
                >
                  <MaterialCommunityIcons name="delete" size={20} color="#ffffff" />
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#2a2a2e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#17bf2d',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e1e22',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'Poppins',
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  buttonContainer: {
    marginTop: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#17bf2d',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Poppins',
    marginLeft: 8,
  },
});

