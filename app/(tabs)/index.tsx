// App.js - Expo Compatible Version
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { recognizeText } from '../../scripts/ocrServices';

const Tab = createBottomTabNavigator();

// Sales Entry Screen
const SalesEntryScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [salesData, setSalesData] = useState([]);
  const [currentEntry, setCurrentEntry] = useState({
    date: '',
    sales: '',
    toBeRemittedToPcso: '',
    paymentMade: '',
    unsettledBalance: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadSalesData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and media library permissions are required for image capture functionality.'
      );
    }
  };

  const loadSalesData = async () => {
    try {
      const data = await AsyncStorage.getItem('salesData');
      if (data) {
        setSalesData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  };

  const saveSalesData = async (data) => {
    try {
      await AsyncStorage.setItem('salesData', JSON.stringify(data));
      setSalesData(data);
    } catch (error) {
      console.error('Error saving sales data:', error);
    }
  };

  const addSalesEntry = () => {
    if (!currentEntry.date || !currentEntry.sales) {
      Alert.alert('Error', 'Please fill in at least date and sales amount');
      return;
    }

    const newEntry = {
      id: Date.now().toString(),
      ...currentEntry,
      sales: parseFloat(currentEntry.sales) || 0,
      toBeRemittedToPcso: parseFloat(currentEntry.toBeRemittedToPcso) || 0,
      paymentMade: parseFloat(currentEntry.paymentMade) || 0,
      unsettledBalance: parseFloat(currentEntry.unsettledBalance) || 0,
    };

    const updatedData = [...salesData, newEntry];
    saveSalesData(updatedData);
    setCurrentEntry({
      date: '',
      sales: '',
      toBeRemittedToPcso: '',
      paymentMade: '',
      unsettledBalance: '',
    });
    setModalVisible(false);
  };

  const captureImage = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const processImage = async (imageUri) => {
    setIsProcessing(true);
    try {
      const extractedText = await recognizeText(imageUri);
      const parsedData = parseTableData(extractedText);
      
      if (parsedData) {
        setCurrentEntry(parsedData);
        setCaptureModalVisible(true);
      } else {
        Alert.alert(
          'No Data Found',
          'Could not extract sales data from image. Please try manual entry.'
        );
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      Alert.alert(
        'Processing Error',
        'Failed to process image. Please try manual entry.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const parseTableData = (text) => {
    if (!text) return null;

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      // Look for date patterns (MM/DD/YY or MM/DD/YYYY)
      const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      
      if (dateMatch) {
        // Extract numbers from the line (potential monetary values)
        const numbers = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
        
        if (numbers && numbers.length >= 2) {
          return {
            date: dateMatch[1],
            sales: numbers[0]?.replace(/,/g, '') || '0',
            toBeRemittedToPcso: numbers[1]?.replace(/,/g, '') || '0',
            paymentMade: numbers[2]?.replace(/,/g, '') || '0',
            unsettledBalance: numbers[3]?.replace(/,/g, '') || '0',
          };
        }
      }
    }
    
    return null;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales Ledger</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.addButton, styles.cameraButton]}
            onPress={captureImage}
            disabled={isProcessing}
          >
            <MaterialIcons name="camera-alt" size={20} color="white" />
            <Text style={styles.buttonText}>
              {isProcessing ? 'Processing...' : 'Capture'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <MaterialIcons name="add" size={20} color="white" />
            <Text style={styles.buttonText}>Manual</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.dateColumn]}>Date</Text>
          <Text style={[styles.tableHeaderText, styles.amountColumn]}>Sales</Text>
          <Text style={[styles.tableHeaderText, styles.amountColumn]}>To PCSO</Text>
          <Text style={[styles.tableHeaderText, styles.amountColumn]}>Payment</Text>
          <Text style={[styles.tableHeaderText, styles.amountColumn]}>Balance</Text>
        </View>

        {salesData.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={[styles.tableCellText, styles.dateColumn]}>{item.date}</Text>
            <Text style={[styles.tableCellText, styles.amountColumn]}>
              {formatCurrency(item.sales)}
            </Text>
            <Text style={[styles.tableCellText, styles.amountColumn]}>
              {formatCurrency(item.toBeRemittedToPcso)}
            </Text>
            <Text style={[styles.tableCellText, styles.amountColumn]}>
              {formatCurrency(item.paymentMade)}
            </Text>
            <Text style={[styles.tableCellText, styles.amountColumn]}>
              {formatCurrency(item.unsettledBalance)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Sales Entry</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Date (MM/DD/YY)"
              value={currentEntry.date}
              onChangeText={(text) => setCurrentEntry({...currentEntry, date: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Sales Amount"
              value={currentEntry.sales}
              onChangeText={(text) => setCurrentEntry({...currentEntry, sales: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="To be Remitted to PCSO"
              value={currentEntry.toBeRemittedToPcso}
              onChangeText={(text) => setCurrentEntry({...currentEntry, toBeRemittedToPcso: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Payment Made"
              value={currentEntry.paymentMade}
              onChangeText={(text) => setCurrentEntry({...currentEntry, paymentMade: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Unsettled Balance"
              value={currentEntry.unsettledBalance}
              onChangeText={(text) => setCurrentEntry({...currentEntry, unsettledBalance: text})}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addSalesEntry}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Capture Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={captureModalVisible}
        onRequestClose={() => setCaptureModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Captured Data</Text>
            <Text style={styles.modalSubtitle}>Please verify the extracted information:</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Date (MM/DD/YY)"
              value={currentEntry.date}
              onChangeText={(text) => setCurrentEntry({...currentEntry, date: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Sales Amount"
              value={currentEntry.sales}
              onChangeText={(text) => setCurrentEntry({...currentEntry, sales: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="To be Remitted to PCSO"
              value={currentEntry.toBeRemittedToPcso}
              onChangeText={(text) => setCurrentEntry({...currentEntry, toBeRemittedToPcso: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Payment Made"
              value={currentEntry.paymentMade}
              onChangeText={(text) => setCurrentEntry({...currentEntry, paymentMade: text})}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Unsettled Balance"
              value={currentEntry.unsettledBalance}
              onChangeText={(text) => setCurrentEntry({...currentEntry, unsettledBalance: text})}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCaptureModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  addSalesEntry();
                  setCaptureModalVisible(false);
                }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Summary Screen
const SummaryScreen = () => {
  const [salesData, setSalesData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await AsyncStorage.getItem('salesData');
        if (data) {
          setSalesData(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error loading sales data:', error);
      }
    };
    loadData();
  }, []);

  const calculateTotals = () => {
    return salesData.reduce(
      (totals, entry) => ({
        totalSales: totals.totalSales + entry.sales,
        totalToRemit: totals.totalToRemit + entry.toBeRemittedToPcso,
        totalPayments: totals.totalPayments + entry.paymentMade,
        totalBalance: totals.totalBalance + entry.unsettledBalance,
      }),
      { totalSales: 0, totalToRemit: 0, totalPayments: 0, totalBalance: 0 }
    );
  };

  const totals = calculateTotals();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Summary</Text>
      </View>

      <ScrollView style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Sales</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totals.totalSales)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>To be Remitted to PCSO</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totals.totalToRemit)}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Payments Made</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totals.totalPayments)}</Text>
        </View>

        <View style={[styles.summaryCard, styles.balanceCard]}>
          <Text style={styles.summaryTitle}>Outstanding Balance</Text>
          <Text style={[styles.summaryAmount, styles.balanceAmount]}>
            {formatCurrency(totals.totalBalance)}
          </Text>
        </View>

        <View style={styles.entriesCount}>
          <Text style={styles.entriesCountText}>
            Total Entries: {salesData.length}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Main App Component
const App = () => {
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#2196F3',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Sales"
          component={SalesEntryScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="attach-money" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Summary"
          component={SummaryScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="assessment" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cameraButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableContainer: {
    flex: 1,
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 4,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tableCellText: {
    fontSize: 11,
    textAlign: 'center',
    color: '#333',
  },
  dateColumn: {
    flex: 1.2,
  },
  amountColumn: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#2196F3',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    textAlign: 'center',
    color: '#666',
    fontWeight: 'bold',
  },
  saveButtonText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
  },
  summaryContainer: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  balanceAmount: {
    color: '#f44336',
  },
  entriesCount: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  entriesCountText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default App;