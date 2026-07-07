// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Icon from '@expo/vector-icons/MaterialIcons';
import * as SQLite from 'expo-sqlite';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const exibirAlerta = (titulo: string, mensagem: string, botoes?: { text: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    const botaoOk = botoes?.find(b => b.onPress);
    if (botaoOk && botaoOk.onPress) botaoOk.onPress();
  } else {
    Alert.alert(titulo, mensagem, botoes);
  }
};

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !senha) {
      exibirAlerta('Aviso', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    // .trim() em ambos os campos para pulverizar espaços invisíveis colados por engano
    const usuarioLimpo = username.trim().toLowerCase();
    const senhaLimpa = senha.trim();

    // --------------------------------------------------------------------------------
    // COMANDO MASTER DE EMERGÊNCIA (BACKDOOR DE RESET)
    // --------------------------------------------------------------------------------
    if (usuarioLimpo === 'admin' && senhaLimpa === 'reset') {
      await AsyncStorage.removeItem('@meatpack:admin_password');
      setSenha('');
      setLoading(false);
      exibirAlerta(
        'Auditoria de Sistema', 
        'Memória do LocalStorage limpa com sucesso!\nA senha do Administrador foi restaurada para o padrão de fábrica: 123456abc'
      );
      return;
    }

    // --------------------------------------------------------------------------------
    // 1. VALIDAÇÃO DO ADMINISTRADOR
    // --------------------------------------------------------------------------------
    if (usuarioLimpo === 'admin') {
      try {
        const senhaMemory = await AsyncStorage.getItem('@meatpack:admin_password');
        
        // Proteção contra falsos positivos de conversão do JS (ex: a string literal "undefined")
        const senhaOficial = (senhaMemory && senhaMemory !== 'undefined' && senhaMemory !== 'null') 
          ? senhaMemory.trim() 
          : '123456abc';

        console.log(`[AUDITORIA] Digitado: "${senhaLimpa}" | O Banco aguarda: "${senhaOficial}"`);

        if (senhaLimpa === senhaOficial) {
          const usuarioAdmin = {
            nomeCompleto: 'Administrador Padrão',
            email: 'admin@meatpack.com',
            apelido: 'Admin'
          };
          setUsername(''); setSenha(''); setLoading(false);
          navigation.navigate('HomeScreen', { usuarioLogado: usuarioAdmin });
          return;
        } else {
          setLoading(false);
          exibirAlerta(
            'Acesso Master Negado', 
            'A senha digitada não corresponde à credencial do Administrador.\n\n(Dica: se esqueceu a senha alterada, digite a senha "reset" para voltar ao padrão)'
          );
          return; // Trava o drop-through
        }
      } catch (e) {
        console.error('Erro ao ler credencial master:', e);
      }
    }

    // --------------------------------------------------------------------------------
    // 2. VALIDAÇÃO DE OPERADORES COMUNS (WEB)
    // --------------------------------------------------------------------------------
    if (Platform.OS === 'web') {
      try {
        const clientesRaw = await AsyncStorage.getItem('@meatpack_web:clientes');
        const clientes = clientesRaw ? JSON.parse(clientesRaw) : [];

        const op = clientes.find((c: any) => 
          c.email.trim().toLowerCase() === usuarioLimpo || 
          c.apelido.trim().toLowerCase() === usuarioLimpo
        );

        setLoading(false);

        if (op) {
          if (op.senha.trim() === senhaLimpa) {
            setUsername(''); setSenha('');
            navigation.navigate('HomeScreen', { usuarioLogado: op });
          } else {
            exibirAlerta('Senha Incorreta', `A senha informada para o operador "${op.nomeCompleto}" está incorreta.`);
          }
        } else {
          exibirAlerta('Conta Inexistente', `Nenhum operador localizado com o e-mail ou apelido "${username}".`);
        }
      } catch (err) {
        setLoading(false);
        exibirAlerta('Erro de Memória', 'Não foi possível ler o repositório Web.');
      }
      return;
    }

    // --------------------------------------------------------------------------------
    // 3. VALIDAÇÃO DE OPERADORES COMUNS (MOBILE / SQLITE)
    // --------------------------------------------------------------------------------
    try {
      const db = SQLite.openDatabaseSync('meatpack.db');
      const resultado: any = await db.getFirstAsync(
        'SELECT * FROM clientes WHERE LOWER(email) = ? OR LOWER(apelido) = ?', 
        [usuarioLimpo, usuarioLimpo]
      );

      setLoading(false);

      if (resultado && resultado.senha.trim() === senhaLimpa) {
        setUsername(''); setSenha('');
        navigation.navigate('HomeScreen', { usuarioLogado: resultado });
      } else {
        exibirAlerta('Erro de Autenticação', 'Operador ou senha incorretos.');
      }
    } catch (error) {
      setLoading(false);
      exibirAlerta('Erro Técnico', 'Falha ao consultar o SQLite.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginCard}>
        <Icon name="storefront" size={48} color={theme?.colors?.primary || '#7A1E1E'} style={styles.logoIcon} />
        <Text style={styles.title}>System Meatpack</Text>
        <Text style={styles.subtitle}>Controle de Logística & Estoque</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Usuário ou E-mail</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Digite seu usuário" 
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Digite sua senha" 
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.btnEntrar} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Icon name="login" size={20} color="#FFF" />
              <Text style={styles.btnTexto}>Entrar no Sistema</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)', justifyContent: 'center', padding: 20 },
  loginCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#e3e3e3', width: '100%', maxWidth: 400, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  logoIcon: { alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme?.colors?.primary || '#7A1E1E', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, backgroundColor: '#f9f9f9', fontSize: 14 },
  btnEntrar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme?.colors?.primary || '#7A1E1E', padding: 14, borderRadius: 6, gap: 8, marginTop: 8 },
  btnTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

