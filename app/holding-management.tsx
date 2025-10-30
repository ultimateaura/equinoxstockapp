import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { PurchaseLot, useHoldings } from '../contexts/HoldingsContext';
import { formatCurrency } from '../utils/formatCurrency';

export default function HoldingManagementScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const { holdings, updateHolding, deleteHolding } = useHoldings();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLot, setEditingLot] = useState<PurchaseLot | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDate, setNewDate] = useState('');

  const holding = holdings.find(h => h.ticker === ticker);

  if (!holding) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Holding not found</Text>
      </View>
    );
  }

  const handleAddLot = () => {
    if (!newQuantity || !newPrice || !newDate) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newLot: PurchaseLot = {
      quantity: parseFloat(newQuantity),
      purchasePrice: parseFloat(newPrice),
      purchaseDate: new Date(newDate).toISOString(),
    };

    const updatedLots = [...(holding.purchaseLots || []), newLot];
    const updatedHolding = { ...holding, purchaseLots: updatedLots };
    
    updateHolding(updatedHolding);
    setNewQuantity('');
    setNewPrice('');
    setNewDate('');
    setShowAddModal(false);
  };

  const handleEditLot = (lot: PurchaseLot) => {
    setEditingLot(lot);
    setNewQuantity(lot.quantity.toString());
    setNewPrice(lot.purchasePrice.toString());
    setNewDate(new Date(lot.purchaseDate).toISOString().split('T')[0]);
    setShowEditModal(true);
  };

  const handleUpdateLot = () => {
    if (!editingLot || !newQuantity || !newPrice || !newDate) return;

    const updatedLots = (holding.purchaseLots || []).map(lot => 
      lot === editingLot 
        ? {
            ...lot,
            quantity: parseFloat(newQuantity),
            purchasePrice: parseFloat(newPrice),
            purchaseDate: new Date(newDate).toISOString(),
          }
        : lot
    );

    const updatedHolding = { ...holding, purchaseLots: updatedLots };
    updateHolding(updatedHolding);
    setShowEditModal(false);
    setEditingLot(null);
    setNewQuantity('');
    setNewPrice('');
    setNewDate('');
  };

  const handleDeleteLot = (lot: PurchaseLot) => {
    Alert.alert(
      'Delete Purchase',
      'Are you sure you want to delete this purchase?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedLots = (holding.purchaseLots || []).filter(l => l !== lot);
            if (updatedLots.length === 0) {
              deleteHolding(holding.ticker);
              router.back();
            } else {
              const updatedHolding = { ...holding, purchaseLots: updatedLots };
              updateHolding(updatedHolding);
            }
          },
        },
      ]
    );
  };

  const getTotalQuantity = () => {
    return (holding.purchaseLots || []).reduce((sum, lot) => sum + lot.quantity, 0);
  };

  const getTotalCost = () => {
    return (holding.purchaseLots || []).reduce((sum, lot) => sum + (lot.quantity * lot.purchasePrice), 0);
  };

  const getAveragePrice = () => {
    const totalQuantity = getTotalQuantity();
    return totalQuantity > 0 ? getTotalCost() / totalQuantity : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{holding.ticker}</Text>
          <TouchableOpacity 
            onPress={() => setShowAddModal(true)} 
            style={styles.addButton}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#17bf2d" />
          </TouchableOpacity>
        </View>

        {/* Holding Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.companyName}>{holding.companyName}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Shares:</Text>
            <Text style={styles.summaryValue}>{getTotalQuantity().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Cost:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(getTotalCost())}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Price:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(getAveragePrice())}</Text>
          </View>
        </View>

        {/* Purchase Lots */}
        <View style={styles.lotsSection}>
          <Text style={styles.sectionTitle}>Purchase History</Text>
          {(holding.purchaseLots || []).map((lot, index) => (
            <View key={index} style={styles.lotCard}>
              <View style={styles.lotHeader}>
                <Text style={styles.lotDate}>{formatDate(lot.purchaseDate)}</Text>
                <TouchableOpacity 
                  onPress={() => handleEditLot(lot)}
                  style={styles.editButton}
                >
                  <MaterialCommunityIcons name="pencil" size={20} color="#17bf2d" />
                </TouchableOpacity>
              </View>
              <View style={styles.lotDetails}>
                <View style={styles.lotRow}>
                  <Text style={styles.lotLabel}>Quantity:</Text>
                  <Text style={styles.lotValue}>{lot.quantity.toFixed(2)}</Text>
                </View>
                <View style={styles.lotRow}>
                  <Text style={styles.lotLabel}>Price:</Text>
                  <Text style={styles.lotValue}>{formatCurrency(lot.purchasePrice)}</Text>
                </View>
                <View style={styles.lotRow}>
                  <Text style={styles.lotLabel}>Total:</Text>
                  <Text style={styles.lotValue}>{formatCurrency(lot.quantity * lot.purchasePrice)}</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => handleDeleteLot(lot)}
                style={styles.deleteButton}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Lot Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Purchase</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={newQuantity}
              onChangeText={setNewQuantity}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Purchase Price"
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Purchase Date (YYYY-MM-DD)"
              value={newDate}
              onChangeText={setNewDate}
            />
            
            <TouchableOpacity style={styles.saveButton} onPress={handleAddLot}>
              <Text style={styles.saveButtonText}>Add Purchase</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Lot Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Purchase</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={newQuantity}
              onChangeText={setNewQuantity}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Purchase Price"
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Purchase Date (YYYY-MM-DD)"
              value={newDate}
              onChangeText={setNewDate}
            />
            
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateLot}>
              <Text style={styles.saveButtonText}>Update Purchase</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1e1e22',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    padding: 8,
  },
  summaryCard: {
    backgroundColor: '#1e1e22',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#b8b8d2',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  lotsSection: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  lotCard: {
    backgroundColor: '#1e1e22',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lotDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#17bf2d',
  },
  editButton: {
    padding: 4,
  },
  lotDetails: {
    marginBottom: 12,
  },
  lotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lotLabel: {
    fontSize: 14,
    color: '#b8b8d2',
  },
  lotValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  deleteButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1e1e22',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  input: {
    backgroundColor: '#1e1e22',
    color: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#17bf2d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
