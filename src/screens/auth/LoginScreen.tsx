// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Icon from '@expo/vector-icons/MaterialIcons';
import * as SQLite from 'expo-sqlite';

// Tipagem das propriedades recebidas pela tela através do React Navigation Stack
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

/**
 * Utilitário Abstrato de Feedback Visual (Multiplataforma).
 * Contorna as limitações de renderização do componente 'Alert' do React Native,
 * disparando caixas de diálogo nativas no ecossistema Mobile ou fallbacks em JS no ambiente Web.
 */
const exibirAlerta = (titulo: string, mensagem: string, botoes?: { text: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    // Localiza e executa programmaticamente o callback de confirmação padrão (caso exista)
    const botaoOk = botoes?.find(b => b.onPress);
    if (botaoOk && botaoOk.onPress) botaoOk.onPress();
  } else {
    Alert.alert(titulo, mensagem, botoes);
  }
};

export default function LoginScreen({ navigation }: Props) {
  // --- CONTROLE DE ESTADOS DO FORMULÁRIO ---
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false); // Ativa o feedback visual de processamento de rede/banco

  /**
   * Processador Principal do Fluxo de Autenticação.
   * Realiza higienização de strings e bifurca o acesso em três camadas hierárquicas.
   */
  const handleLogin = async () => {
    // Validação estrita de campos vazios antes do processamento
    if (!username || !senha) {
      exibirAlerta('Aviso', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    // Tratamento higiênico de inputs (Sanitização)
    // Remove espaçamentos invisíveis inseridos por teclados móveis (.trim()) e ignora o Case-Sensitive
    const usuarioLimpo = username.trim().toLowerCase();
    const senhaLimpa = senha.trim();

    // --------------------------------------------------------------------------------
    // CANAL A: COMANDO MASTER DE EMERGÊNCIA (BACKDOOR DE RESET)
    // --------------------------------------------------------------------------------
    // Permite restaurar o sistema caso o administrador mude a senha mestra e a perca por esquecimento.
    if (usuarioLimpo === 'admin' && senhaLimpa === 'reset') {
      await AsyncStorage.removeItem('@meatpack:admin_password'); // Remove a senha alterada do disco
      setSenha('');
      setLoading(false);
      exibirAlerta(
        'Auditoria de Sistema', 
        'Memória do LocalStorage limpa com sucesso!\nA senha do Administrador foi restaurada para o padrão de fábrica: 123456abc'
      );
      return;
    }

    // --------------------------------------------------------------------------------
    // CANAL B: VALIDAÇÃO DO ADMINISTRADOR DO SISTEMA (CONTA CORPORATIVA MASTER)
    // --------------------------------------------------------------------------------
    // O Administrador não fica registrado na tabela comum de clientes. Suas credenciais
    // residem em chaves isoladas no AsyncStorage para segurança estrutural de permissões.
    if (usuarioLimpo === 'admin') {
      try {
        const senhaMemory = await AsyncStorage.getItem('@meatpack:admin_password');
        
        // Proteção contra falsos positivos de conversão do JS (evita ler strings literais "undefined")
        const senhaOficial = (senhaMemory && senhaMemory !== 'undefined' && senhaMemory !== 'null') 
          ? senhaMemory.trim() 
          : '123456abc'; // Senha fallback padrão de fábrica

        console.log(`[AUDITORIA] Digitado: "${senhaLimpa}" | O Banco aguarda: "${senhaOficial}"`);

        if (senhaLimpa === senhaOficial) {
          const usuarioAdmin = {
            nomeCompleto: 'Administrador Padrão',
            email: 'admin@meatpack.com',
            apelido: 'Admin'
          };
          setUsername(''); setSenha(''); setLoading(false);
          // Encaminha a sessão ativa para o Menu Principal injetando o payload do Admin
          navigation.navigate('HomeScreen', { usuarioLogado: usuarioAdmin });
          return;
        } else {
          setLoading(false);
          exibirAlerta(
            'Acesso Master Negado', 
            'A senha digitada não corresponde à credencial do Administrador.\n\n(Dica: se esqueceu a senha alterada, digite a senha "reset" para voltar ao padrão)'
          );
          return; // Bloqueia a execução para evitar que o Admin caia nas queries normais abaixo
        }
      } catch (e) {
        console.error('Erro ao ler credencial master:', e);
      }
    }

    // --------------------------------------------------------------------------------
    // CANAL C: VALIDAÇÃO DE OPERADORES COMUNS (COMPORTAMENTO MULTIPLATAFORMA)
    // --------------------------------------------------------------------------------
    
    // C.1 - Ambiente de Produção / Simulação WEB (AsyncStorage Mock)
    if (Platform.OS === 'web') {
      try {
        const clientesRaw = await AsyncStorage.getItem('@meatpack_web:clientes');
        const clientes = clientesRaw ? JSON.parse(clientesRaw) : [];

        // Varre a coleção simulada buscando casamento de chaves por e-mail ou apelido comercial
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

    // C.2 - Ambiente de Produção MOBILE / DISPOSITIVOS NATIVOS (Queries em SQLite)
    try {
      const db = SQLite.openDatabaseSync('meatpack.db');
      // Consulta o SQLite de forma assíncrona aplicando filtros em LowerCase para blindar a busca
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
      exibirAlerta('Erro Técnico', 'Falha ao consultar o banco local SQLite.');
    }
  };

  // --- INTERFACE VISUAL DA TELA ---
  return (
    <View style={styles.container}>
      <View style={styles.loginCard}>
        {/* Logotipo/Ícone representativo da fachada do estabelecimento */}
        <Icon name="storefront" size={48} color={theme?.colors?.primary || '#7A1E1E'} style={styles.logoIcon} />
        <Text style={styles.title}>System Meatpack</Text>
        <Text style={styles.subtitle}>Controle de Logística & Estoque</Text>

        {/* INPUT: IDENTIFICADOR DO OPERADOR */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Usuário ou E-mail</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Digite seu usuário" 
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none" // Impede correções automáticas de maiúsculas em logins
            autoCorrect={false}   // Desativa sugestões do dicionário do aparelho
          />
        </View>

        {/* INPUT: CREDENCIAL DE SEGURANÇA */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Digite sua senha" 
            secureTextEntry     // Aplica a máscara de proteção de caracteres (caractere oculto)
            value={senha}
            onChangeText={setSenha}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* BOTÃO DE SUBMISSÃO DA SESSÃO */}
        <TouchableOpacity style={styles.btnEntrar} onPress={handleLogin} disabled={loading}>
          {loading ? (
            // Exibe indicador giratório dinâmico impedindo cliques repetitivos durante o processamento
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

// ============================================================================
// --- DESIGN E ESTILIZAÇÃO VISUAL (STYLESHEET) ---
// ============================================================================
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