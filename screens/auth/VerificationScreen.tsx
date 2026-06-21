import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStackParamList';
import { theme } from '../../styles/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Verification'>;

export default function VerificationScreen({ route, navigation }: Props) {
  const { email, telefone } = route.params;
  const [code, setCode] = useState('');

  const handleVerify = () => {
    // Aqui você adicionaria a lógica para validar o código (API ou Banco)
    if (code === '123456') {
      Alert.alert('Sucesso', 'Conta verificada com sucesso!');
      navigation.navigate('Login');
    } else {
      Alert.alert('Erro', 'Código inválido.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificação</Text>
      <Text style={styles.subtitle}>Enviamos um código para {email}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Digite o código de 6 dígitos"
        keyboardType="numeric"
        value={code}
        onChangeText={setCode}
        maxLength={6}
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verificar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: theme.spacing.m },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: theme.spacing.m },
  subtitle: { textAlign: 'center', marginBottom: theme.spacing.xl, color: theme.colors.textLight },
  input: { borderWidth: 1, borderColor: theme.colors.primaryLight, padding: theme.spacing.m, borderRadius: theme.borderRadius.m, marginBottom: theme.spacing.m, fontSize: 18, textAlign: 'center' },
  button: { backgroundColor: theme.colors.primary, padding: theme.spacing.m, borderRadius: theme.borderRadius.m, alignItems: 'center' },
  buttonText: { color: theme.colors.surface, fontWeight: 'bold' }
});