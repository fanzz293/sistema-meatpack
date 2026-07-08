// src/screens/auth/SignupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { addCliente } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStackParamList';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import ScreenWrapper from '../../components/ScreenWrapper';
import Icon from '@expo/vector-icons/MaterialIcons';

// Tipagem das propriedades de navegação vinculadas à pilha de autenticação
type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

/**
 * Utilitário multiplataforma para exibição de diálogos informativos.
 * Canaliza a execução para caixas nativas (Mobile) ou prompts síncronos (Web).
 */
const exibirAlerta = (titulo: string, mensagem: string, botoes?: { text: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    const botaoOk = botoes?.find(b => b.onPress);
    if (botaoOk && botaoOk.onPress) botaoOk.onPress();
  } else {
    Alert.alert(titulo, mensagem, botoes);
  }
};

export default function SignupScreen({ navigation }: Props) {
  // --- ESTADO ÚNICO DO FORMULÁRIO (DADOS CADASTRAIS) ---
  const [formData, setFormData] = useState({
    apelido: '',
    senha: '',
    nomeCompleto: '',
    endereco: '',
    numero: '',
    bairro: '',
    municipio: '',
    cpf: '',
    email: '',
    telefone: '',
  });
  
  // --- ESTADOS DE CONTROLE VISUAL E CONTRATUAL ---
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Alterna a máscara de segurança do input de senha

  /**
   * Atualizador genérico de chaves de estado de texto do formulário.
   */
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Validador Algorítmico de CPF baseado no cálculo dos Dígitos Verificadores (DVs).
   * Elimina máscaras e executa varreduras matemáticas de integridade nacional.
   */
  const validateCPF = (cpf: string): boolean => {
    // Sanitização completa: Remove qualquer caractere que não seja numérico
    cpf = cpf.replace(/[^\d]/g, '');
    
    // Rejeição sumária caso não possua 11 dígitos ou seja uma sequência conhecida de números repetidos
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validação matemática do Primeiro Dígito Verificador (Posição 9)
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    // Validação matemática do Segundo Dígito Verificador (Posição 10)
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(cpf.charAt(10));
  };

  /**
   * Validador de Força de Senha Corporativa via Regex (Expressão Regular).
   * Exige: Mínimo 8 caracteres, 1 Letra Maiúscula, 1 Minúscula, 1 Número e 1 Caractere Especial.
   */
  const validatePassword = (password: string): boolean => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
  };

  /**
   * Orquestrador de Submissão do Cadastro.
   * Valida as restrições de negócio e persiste as informações no banco de dados local ou mockado.
   */
  const handleSignup = async () => {
    // 1. Barreira contratual de Termos de Uso
    if (!aceitaTermos) {
      exibirAlerta('Atenção', 'Você precisa aceitar os termos de uso.');
      return;
    }
    // 2. Barreira de segurança cibernética de senha
    if (!validatePassword(formData.senha)) {
      exibirAlerta('Senha inválida', 'A senha deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, 1 número e 1 símbolo.');
      return;
    }
    // 3. Barreira fiscal/legal de identificação (CPF)
    if (!validateCPF(formData.cpf)) {
      exibirAlerta('CPF inválido', 'Por favor, insira um CPF válido.');
      return;
    }

    setIsLoading(true);
    try {
      // Mescla as chaves de texto com a flag de termos e despacha para o database.ts
      await addCliente({ ...formData, aceitaTermos });
      exibirAlerta('Cadastro realizado!', 'Faça agora o seu login.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      exibirAlerta('Erro', error.message || 'Não foi possível realizar o cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ARRAYS DE CONFIGURAÇÃO DE RENDERIZAÇÃO EM LOTE (MAPPING) ---
  // Mapeia os inputs de forma declarativa para enxugar o código JSX da tela
  const formFields = [
    { field: 'apelido', label: 'Apelido', placeholder: 'Como quer ser chamado', keyboardType: 'default' as const },
    { field: 'nomeCompleto', label: 'Nome Completo', placeholder: 'Seu nome completo', keyboardType: 'default' as const },
    { field: 'email', label: 'E-mail', placeholder: 'seu@email.com', keyboardType: 'email-address' as const },
    { field: 'cpf', label: 'CPF', placeholder: '000.000.000-00', keyboardType: 'numeric' as const },
    { field: 'telefone', label: 'Telefone', placeholder: '(00) 00000-0000', keyboardType: 'phone-pad' as const },
    { field: 'endereco', label: 'Endereço', placeholder: 'Seu endereço completo', keyboardType: 'default' as const },
    { field: 'numero', label: 'Número', placeholder: 'Número', keyboardType: 'numeric' as const },
    { field: 'bairro', label: 'Bairro', placeholder: 'Bairro', keyboardType: 'default' as const },
    { field: 'municipio', label: 'Município', placeholder: 'Município', keyboardType: 'default' as const },
  ];

  return (
    <ScreenWrapper>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* 'KeyboardAvoidingView' evita que o teclado virtual do smartphone cubra os inputs inferiores do formulário */}
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          
          {/* ANIMAÇÃO DE ENTRADA DO CABEÇALHO */}
          <AnimatedView from="top">
            <View style={styles.header}>
              <Text style={styles.title}>Criar Conta</Text>
              <Text style={styles.subtitle}>Preencha seus dados para começar</Text>
            </View>
          </AnimatedView>

          {/* PAINEL CENTRALIZADO DO FORMULÁRIO */}
          <View style={styles.formContainer}>
            
            {/* RENDERIZAÇÃO DINÂMICA DOS CAMPOS DE TEXTO MAURADOS NO ARRAY */}
            {formFields.map((item, index) => (
              // Cada linha possui um atraso incremental (index * 50ms) criando um efeito cascade suave de entrada
              <AnimatedView key={item.field} from="right" delay={200 + index * 50}>
                <Text style={styles.label}>{item.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={item.placeholder}
                  placeholderTextColor={theme.colors.textLight}
                  value={formData[item.field as keyof typeof formData]}
                  onChangeText={(text) => handleChange(item.field as keyof typeof formData, text)}
                  keyboardType={item.keyboardType}
                  // Força caixa baixa se for e-mail, ou inicia palavras em maiúsculas (Nomes, Bairros)
                  autoCapitalize={item.field === 'email' ? 'none' : 'words'}
                />
              </AnimatedView>
            ))}

            {/* CAMPO EXCLUSIVO DE SENHA (MÁSCARA CHAVEÁVEL) */}
            <AnimatedView from="bottom" delay={700}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Sua senha secreta"
                  placeholderTextColor={theme.colors.textLight}
                  value={formData.senha}
                  onChangeText={(text) => handleChange('senha', text)}
                  secureTextEntry={!showPassword} // Oculta os caracteres se showPassword for falso
                  textContentType="password"
                />
                {/* Botão de alternância visual do olho de visibilidade da senha */}
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
              </View>
              <Text style={styles.passwordHint}>A senha deve conter pelo menos 8 caracteres, com maiúsculas, minúsculas, número e símbolo.</Text>
            </AnimatedView>

            {/* SESSÃO CONTRATUAL: CHECKBOX DE TERMOS DE USO */}
            <AnimatedView from="bottom" delay={800}>
              <TouchableOpacity style={styles.termsContainer} onPress={() => setAceitaTermos(!aceitaTermos)}>
                <View style={[styles.checkbox, aceitaTermos && styles.checkboxChecked]}>
                  {aceitaTermos && <Icon name="check" size={16} color="#FFF" />}
                </View>
                <Text style={styles.termsText}>Aceito os termos de uso</Text>
              </TouchableOpacity>
            </AnimatedView>

            {/* GATILHO DE SUBMISSÃO CADASTRAL */}
            <AnimatedView from="bottom" delay={900}>
              <TouchableOpacity 
                style={[styles.signupButton, isLoading && styles.signupButtonDisabled]} 
                onPress={handleSignup} 
                disabled={isLoading}
              >
                <Icon name="person-add" size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.signupButtonText}>{isLoading ? 'Criando conta...' : 'Criar Conta'}</Text>
              </TouchableOpacity>
            </AnimatedView>

            {/* LINK RETROATIVO DE RETORNO */}
            <AnimatedView from="bottom" delay={1000}>
              <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                <Icon name="arrow-back" size={16} color={theme.colors.primary} />
                <Text style={styles.loginLinkText}>Já tem uma conta? <Text style={styles.loginLinkBold}>Entrar</Text></Text>
              </TouchableOpacity>
            </AnimatedView>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// ============================================================================
// --- FOLHA DE ESTILOS DA INTERFACE (STYLESHEET) ---
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: theme.spacing.m, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', marginBottom: theme.spacing.xl },
  title: { fontSize: 32, fontWeight: 'bold', color: theme.colors.surface, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
  subtitle: { fontSize: 16, color: theme.colors.surface, marginTop: theme.spacing.s },
  formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: theme.borderRadius.xl, padding: theme.spacing.xl, ...theme.shadows.l },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  input: { padding: theme.spacing.m, borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.m, marginBottom: theme.spacing.m, backgroundColor: theme.colors.surface, fontSize: 16, color: theme.colors.text },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: theme.borderRadius.m, backgroundColor: theme.colors.surface, marginBottom: theme.spacing.xs },
  passwordInput: { flex: 1, padding: theme.spacing.m, fontSize: 16, color: theme.colors.text },
  passwordHint: { fontSize: 12, color: theme.colors.textLight, marginBottom: theme.spacing.m, fontStyle: 'italic' },
  eyeButton: { padding: theme.spacing.m },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.l },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: theme.colors.primary, borderRadius: theme.borderRadius.s, marginRight: theme.spacing.s, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: theme.colors.primary },
  termsText: { color: theme.colors.text, fontSize: 14 },
  signupButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, padding: theme.spacing.m, borderRadius: theme.borderRadius.m, marginBottom: theme.spacing.m, ...theme.shadows.m },
  signupButtonDisabled: { opacity: 0.7 },
  signupButtonText: { color: theme.colors.surface, fontSize: 16, fontWeight: 'bold' },
  buttonIcon: { marginRight: theme.spacing.s },
  loginLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.m },
  loginLinkText: { color: theme.colors.text, fontSize: 14, marginLeft: theme.spacing.s },
  loginLinkBold: { fontWeight: 'bold', color: theme.colors.primary }
});