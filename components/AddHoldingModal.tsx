import { useHoldings } from '@/contexts/HoldingsContext';
import { logoService } from '@/utils/logoService';
import { stockApiService } from '@/utils/stockApi';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';

interface AddHoldingModalProps {
  visible: boolean;
  onDismiss: () => void;
  ticker?: string;
}

export const AddHoldingModal = ({ visible, onDismiss, ticker }: AddHoldingModalProps) => {
  const { addPurchaseLot } = useHoldings();
  const [inputTicker, setInputTicker] = useState(ticker || '');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [tickerError, setTickerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddHolding = async () => {
    if (!inputTicker || !quantity || !purchasePrice) return;

    setIsLoading(true);
    try {
      // Fetch real-time stock data
      const quoteResponse = await stockApiService.getStockQuote(inputTicker.toUpperCase());
      
      if (!quoteResponse.success || !quoteResponse.data) {
        setTickerError('Ticker not found. Please check the symbol and try again.');
        setIsLoading(false);
        return;
      }

      const stockData = quoteResponse.data;
      const companyName = stockData.longName || stockData.shortName || inputTicker.toUpperCase();
      
      // Get logo
      const logoUrl = await logoService.getStockLogo(inputTicker.toUpperCase(), companyName);

      // Clear any previous errors
      setTickerError('');

      // Use addPurchaseLot which will create a new holding if it doesn't exist
      addPurchaseLot(inputTicker.toUpperCase(), {
        quantity: parseFloat(quantity),
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate: new Date().toISOString(),
      });

      // Reset form
      setInputTicker('');
      setQuantity('');
      setPurchasePrice('');
      setTickerError('');
      setIsLoading(false);
      onDismiss();
    } catch (error) {
      console.error('Error adding holding:', error);
      setTickerError('Failed to fetch stock data. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setInputTicker('');
    setQuantity('');
    setPurchasePrice('');
    setTickerError('');
    setIsLoading(false);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            <Card.Content>
              <Text  style={styles.title}>
                Add Holding
              </Text>
              <Text  style={styles.subtitle}>
                Track your actual investments from your brokerage account
              </Text>

              <TextInput
                label="Stock Ticker"
                value={inputTicker}
                onChangeText={(text) => {
                  setInputTicker(text);
                  // Clear error when user starts typing
                  if (tickerError) setTickerError('');
                }}
                style={styles.input}
                autoCapitalize="characters"
                placeholder="e.g., AAPL"
              />
              {tickerError ? (
                <Text style={styles.errorText}>{tickerError}</Text>
              ) : null}

              <TextInput
                label="Quantity (Shares)"
                value={quantity}
                onChangeText={setQuantity}
                style={styles.input}
                keyboardType="numeric"
                placeholder="e.g., 10"
              />

              <TextInput
                label="Purchase Price per Share"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                style={styles.input}
                keyboardType="numeric"
                placeholder="e.g., 150.00"
              />

              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  onPress={handleDismiss}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAddHolding}
                  style={styles.addButton}
                  disabled={!inputTicker || !quantity || !purchasePrice || isLoading}
                  loading={isLoading}
                >
                  {isLoading ? 'Adding...' : 'Add Holding'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
    padding: 20,
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#161B22',
    borderLeftWidth: 4,
    borderLeftColor: '#4A9EFF',
  },
  title: {
    fontWeight: 'bold',
    color: '#C9D1D9',
    marginBottom: 5,
  },
  subtitle: {
    color: '#6E7681',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#0D1117',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#6E7681',
  },
  cancelButtonText: {
    color: '#6E7681',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#4A9EFF',
  },
  addButtonText: {
    color: '#0D1117',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 16,
  },
});
