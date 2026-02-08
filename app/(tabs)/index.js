import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ActivityIndicator, Image, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// ✅ IP Server (เช็ค IP ของเครื่องคุณอีกทีนะครับ)
const API_URL = 'http://192.168.102.93:3000'; 

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); 
  const [user, setUser] = useState(null); 
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // ข้อมูลการจดมิเตอร์
  const [selectedMeter, setSelectedMeter] = useState('water'); // 'water' | 'electric'
  const [imageUri, setImageUri] = useState(null);
  const [serverImagePath, setServerImagePath] = useState('');
  const [readingValue, setReadingValue] = useState('');
  const [roomNumber, setRoomNumber] = useState(''); 
  const [loading, setLoading] = useState(false);

  // Theme Colors ตามรูป
  const THEME = {
    water: '#2196F3',    // ฟ้าสด
    electric: '#FF9800', // ส้มสด
    success: '#4CAF50',  // เขียว
    gray: '#F5F5F5',     // เทาพื้นหลัง Input
    text: '#333'
  };

  const currentThemeColor = selectedMeter === 'water' ? THEME.water : THEME.electric;

  // --- 1. Login ---
  const handleLogin = async () => {
    if(!usernameInput || !passwordInput) return Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบ');
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      
      const result = await response.json();
      if (result.success) {
        setUser(result.user);
        setCurrentScreen('menu');
        setUsernameInput('');
        setPasswordInput('');
      } else {
        Alert.alert('ผิดพลาด', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'เชื่อมต่อ Server ไม่ได้ (เช็ค IP/Firewall)');
    } finally {
      setLoading(false);
    }
  };

  // --- 2. เตรียมหน้าจดมิเตอร์ ---
  const selectMeter = (type) => {
    setSelectedMeter(type);
    setImageUri(null);
    setReadingValue('');
    setRoomNumber(''); 
    setServerImagePath('');
    setCurrentScreen('preview');
  };

  // --- 3. ถ่ายรูป & OCR ---
  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('ขออภัย', 'ต้องการสิทธิ์กล้อง');

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      readMeterImage(uri);
    }
  };

  const readMeterImage = async (uri) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', { uri: uri, type: 'image/jpeg', name: 'meter.jpg' });
      formData.append('meter_type', selectedMeter); 
      
      const response = await fetch(`${API_URL}/api/ocr`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setReadingValue(result.reading);
        setServerImagePath(result.image_path);
      } else {
        Alert.alert('แจ้งเตือน', 'อ่านตัวเลขไม่ออก กรุณากรอกเอง');
      }
    } catch (error) {
      Alert.alert('Error', 'เชื่อมต่อ Server ไม่ได้');
    } finally {
      setLoading(false);
    }
  };

  // --- 4. บันทึกข้อมูล (Save) ---
  const saveData = async () => {
    if (!roomNumber) return Alert.alert('เตือน', 'กรุณากรอกเลขห้องครับ');
    if (!serverImagePath) return Alert.alert('เตือน', 'กรุณาถ่ายรูปก่อนครับ');
    if (!readingValue) return Alert.alert('เตือน', 'กรุณากรอกเลขมิเตอร์');

    setLoading(true);
    try {
      const payload = {
        reading: readingValue,
        image_path: serverImagePath,
        room_number: roomNumber,
        meter_type: selectedMeter,
        user_id: user.id 
      };

      const response = await fetch(`${API_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('สำเร็จ!', `บันทึกห้อง ${roomNumber} เรียบร้อย`, [
            { text: 'OK', onPress: () => setCurrentScreen('menu') }
        ]);
      } else {
        Alert.alert('บันทึกไม่สำเร็จ', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'บันทึกไม่ได้ เช็ค Server ครับ');
    } finally {
      setLoading(false);
    }
  };

  // ================= UI SECTIONS =================

  // 1. LOGIN SCREEN
  if (currentScreen === 'login') {
    return (
      <View style={styles.containerWhite}>
        <View style={styles.loginHeader}>
          <View style={styles.userIconCircle}>
            <Ionicons name="person" size={60} color="#333" />
          </View>
          <Text style={styles.loginTitle}>ล็อกอิน</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputWrapper}>
             <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
             <TextInput style={styles.inputPlain} placeholder="ชื่อผู้ใช้" value={usernameInput} onChangeText={setUsernameInput} autoCapitalize="none"/>
          </View>
          
          <View style={styles.inputWrapper}>
             <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
             <TextInput style={styles.inputPlain} placeholder="รหัสผ่าน" secureTextEntry value={passwordInput} onChangeText={setPasswordInput}/>
          </View>

          <TouchableOpacity style={styles.loginBtnBlue} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnTextWhite}>เข้าสู่ระบบ</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2. MENU SCREEN (เลือกประเภท)
  if (currentScreen === 'menu') {
    return (
      <View style={styles.containerWhite}>
        {/* Header สีฟ้า */}
        <View style={[styles.headerBar, {backgroundColor: THEME.water}]}>
           <Text style={styles.headerTitle}>เลือกประเภท</Text>
           <Text style={styles.headerSubtitle}>{user?.username}</Text>
        </View>

        <View style={styles.menuContainer}>
           <TouchableOpacity style={styles.menuCardWater} onPress={() => selectMeter('water')}>
              <Ionicons name="water" size={60} color={THEME.water} />
              <Text style={[styles.menuText, {color: THEME.water}]}>น้ำ</Text>
           </TouchableOpacity>

           <TouchableOpacity style={styles.menuCardElec} onPress={() => selectMeter('electric')}>
              <Ionicons name="flash" size={60} color={THEME.electric} />
              <Text style={[styles.menuText, {color: THEME.electric}]}>ไฟฟ้า</Text>
           </TouchableOpacity>

           <TouchableOpacity onPress={() => setCurrentScreen('login')} style={{marginTop: 40}}>
             <Text style={{color: 'red', fontSize: 16}}>ออกจากระบบ</Text>
           </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3. SCAN/PREVIEW SCREEN (หน้าจดมิเตอร์)
  if (currentScreen === 'preview') {
    return (
      <View style={styles.containerWhite}>
        <StatusBar backgroundColor={currentThemeColor} barStyle="light-content" />
        
        {/* Header Dynamic Color */}
        <View style={[styles.headerBar, {backgroundColor: currentThemeColor, flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 15}]}>
           <TouchableOpacity onPress={() => setCurrentScreen('menu')} style={{marginRight: 20}}>
             <Ionicons name="chevron-back" size={30} color="white" />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>{selectedMeter === 'water' ? 'มิเตอร์น้ำ' : 'มิเตอร์ไฟ'}</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
        <ScrollView contentContainerStyle={{padding: 20, alignItems: 'center'}}>

          {/* Image Area (Frame) */}
          <View style={[styles.imageFrame, { borderColor: currentThemeColor }]}>
             {imageUri ? (
               <Image source={{ uri: imageUri }} style={styles.fullImage} resizeMode="cover" />
             ) : (
               <View style={styles.emptyImagePlaceholder}>
                  <Ionicons name="camera-outline" size={60} color="#ddd" />
               </View>
             )}
             
             {/* Corner Markers (ตกแต่งให้เหมือน Crop) */}
             <View style={[styles.corner, {top: 10, left: 10, borderTopWidth: 3, borderLeftWidth: 3, borderColor: currentThemeColor}]} />
             <View style={[styles.corner, {top: 10, right: 10, borderTopWidth: 3, borderRightWidth: 3, borderColor: currentThemeColor}]} />
             <View style={[styles.corner, {bottom: 10, left: 10, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: currentThemeColor}]} />
             <View style={[styles.corner, {bottom: 10, right: 10, borderBottomWidth: 3, borderRightWidth: 3, borderColor: currentThemeColor}]} />
          </View>

          {/* Button ถ่ายรูป */}
          <TouchableOpacity style={[styles.btnSmall, {backgroundColor: currentThemeColor}]} onPress={takePicture}>
             <Text style={styles.btnTextWhite}>{imageUri ? 'ถ่ายใหม่' : 'ถ่ายรูปภาพ'}</Text>
          </TouchableOpacity>

          {/* Form Area */}
          <View style={styles.formCard}>
             <View style={styles.formRow}>
                <Text style={styles.label}>ห้อง (Room)</Text>
                <TextInput 
                   style={styles.inputUnderline} 
                   value={roomNumber} 
                   onChangeText={setRoomNumber} 
                   keyboardType="numeric" 
                   placeholder="ระบุเลขห้อง"
                />
             </View>
             
             <View style={styles.divider} />

             <View style={{alignItems: 'center', marginVertical: 15}}>
                <Text style={styles.labelSmall}>ค่าปัจจุบัน</Text>
                <TextInput 
                  style={[styles.bigNumberInput, {color: currentThemeColor}]} 
                  value={readingValue} 
                  onChangeText={setReadingValue} 
                  keyboardType="numeric" 
                  placeholder="0000"
                  placeholderTextColor="#ddd"
                />
             </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.btnSuccess} onPress={saveData} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnTextWhite}>บันทึกข้อมูล</Text>}
          </TouchableOpacity>

        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return <View />;
}

// ================= STYLES =================
const styles = StyleSheet.create({
  containerWhite: { flex: 1, backgroundColor: 'white' },
  
  // Header
  headerBar: { width: '100%', height: 100, paddingTop: 40, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOpacity: 0.1, elevation: 4 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, position: 'absolute', right: 15, top: 60 },

  // Login
  loginHeader: { alignItems: 'center', marginTop: 80, marginBottom: 40 },
  userIconCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#333', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  loginTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  formContainer: { paddingHorizontal: 40 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 5, marginBottom: 15, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#E0E0E0' },
  inputIcon: { marginRight: 10 },
  inputPlain: { flex: 1, fontSize: 16, color: '#333' },
  loginBtnBlue: { backgroundColor: '#2196F3', height: 50, borderRadius: 5, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  
  // Menu
  menuContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  menuCardWater: { width: '100%', height: 120, backgroundColor: '#E3F2FD', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#BBDEFB' },
  menuCardElec: { width: '100%', height: 120, backgroundColor: '#FFF3E0', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#FFE0B2' },
  menuText: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },

  // Preview / Scan
  imageFrame: { width: 280, height: 280, backgroundColor: '#FAFAFA', borderWidth: 1, borderRadius: 2, position: 'relative', marginBottom: 20, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '100%' },
  emptyImagePlaceholder: { alignItems: 'center' },
  corner: { width: 20, height: 20, position: 'absolute' },
  
  btnSmall: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 5, marginBottom: 20 },
  
  formCard: { width: '100%', backgroundColor: 'white', borderWidth: 1, borderColor: '#eee', borderRadius: 5, padding: 15, shadowColor: "#000", shadowOffset: {width:0,height:1}, shadowOpacity: 0.1, elevation: 2, marginBottom: 20 },
  formRow: { alignItems: 'center', marginBottom: 5 },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  labelSmall: { fontSize: 12, color: '#999' },
  inputUnderline: { fontSize: 22, fontWeight: 'bold', color: '#333', borderBottomWidth: 1, borderBottomColor: '#ddd', width: 150, textAlign: 'center', padding: 5 },
  bigNumberInput: { fontSize: 50, fontWeight: 'bold', textAlign: 'center', width: '100%', letterSpacing: 2 },
  divider: { height: 1, backgroundColor: '#eee', width: '100%', marginVertical: 10 },

  btnSuccess: { backgroundColor: '#4CAF50', width: '100%', height: 55, justifyContent: 'center', alignItems: 'center', borderRadius: 5 },
  btnTextWhite: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});