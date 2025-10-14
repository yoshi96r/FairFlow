import React, { useState } from 'react';
import { SafeAreaView, Text, Button, TextInput, View } from 'react-native';
import { startBackground } from './background';

const API = 'http://localhost:3001';

export default function App(){
  const [phone, setPhone] = useState('5550001');
  const [token, setToken] = useState<string | null>(null);

  async function login(){
    const r = await fetch(`${API}/api/mobile/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone }) });
    const j = await r.json();
    if (j?.token) { setToken(j.token); await startBackground(j.token); }
  }

  return (
    <SafeAreaView style={{ padding: 16 }}>
      {!token ? (
        <View>
          <Text style={{ fontSize: 16, marginBottom: 8 }}>Login as Driver</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" style={{ borderWidth:1, padding:8, marginBottom:12 }} />
          <Button title="Login" onPress={login} />
        </View>
      ) : (
        <Text>Background tracking active. Token set.</Text>
      )}
    </SafeAreaView>
  );
}