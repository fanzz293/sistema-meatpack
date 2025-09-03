// src/screens/auth/SignupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { addCliente } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStackParamList';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
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
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validação de CPF
  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(cpf.charAt(10));
  };

  // Validação de senha
  const validatePassword = (password: string): boolean => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };

  const handleSignup = async () => {
    if (!aceitaTermos) {
      Alert.alert('Atenção', 'Você precisa aceitar os termos de uso.');
      return;
    }

    // Validações
    if (!validatePassword(formData.senha)) {
      Alert.alert(
        'Senha inválida', 
        'A senha deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, 1 número e 1 símbolo.'
      );
      return;
    }

    if (!validateCPF(formData.cpf)) {
      Alert.alert('CPF inválido', 'Por favor, insira um CPF válido.');
      return;
    }

    setIsLoading(true);
    
    try {
      await addCliente({ ...formData, aceitaTermos });
      Alert.alert(
        'Cadastro realizado!', 
        'Faça agora o seu login.'
      );
      // Redirecionar para tela de verificação
      navigation.navigate('Verification', { email: formData.email, telefone: formData.telefone });
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      Alert.alert('Erro', error.message || 'Não foi possível realizar o cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ImageBackground 
        source={require('../../../assets/meat-background.jpg')}
        style={styles.background}
        blurRadius={2}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <AnimatedView from="top">
              <View style={styles.header}>
                <Text style={styles.title}>Criar Conta</Text>
                <Text style={styles.subtitle}>Preencha seus dados para começar</Text>
              </View>
            </AnimatedView>

            <View style={styles.formContainer}>
              {formFields.map((item, index) => (
                <AnimatedView key={item.field} from="right" delay={300 + index * 100}>
                  <Text style={styles.label}>{item.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={item.placeholder}
                    placeholderTextColor={theme.colors.textLight}
                    value={formData[item.field as keyof typeof formData]}
                    onChangeText={(text) => handleChange(item.field as keyof typeof formData, text)}
                    keyboardType={item.keyboardType}
                    autoCapitalize={item.field === 'email' ? 'none' : 'words'}
                  />
                </AnimatedView>
              ))}

              <AnimatedView from="bottom" delay={900}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Sua senha secreta"
                    placeholderTextColor={theme.colors.textLight}
                    value={formData.senha}
                    onChangeText={(text) => handleChange('senha', text)}
                    secureTextEntry={!showPassword}
                    textContentType="password"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={theme.colors.textLight} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.passwordHint}>
                  A senha deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, 1 número e 1 símbolo.
                </Text>
              </AnimatedView>

              <AnimatedView from="bottom" delay={1100}>
                <TouchableOpacity 
                  style={styles.termsContainer}
                  onPress={() => setAceitaTermos(!aceitaTermos)}
                >
                  <View style={[styles.checkbox, aceitaTermos && styles.checkboxChecked]}>
                    {aceitaTermos && <Icon name="check" size={16} color="#FFF" />}
                  </View>
                  <Text style={styles.termsText}>Aceito os termos de uso</Text>
                </TouchableOpacity>
              </AnimatedView>

              <AnimatedView from="bottom" delay={1300}>
                <TouchableOpacity 
                  style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
                  onPress={handleSignup}
                  disabled={isLoading}
                >
                  <Icon name="person-add" size={20} color="#FFF" style={styles.buttonIcon} />
                  <Text style={styles.signupButtonText}>
                    {isLoading ? 'Criando conta...' : 'Criar Conta'}
                  </Text>
                </TouchableOpacity>
              </AnimatedView>

              <AnimatedView from="bottom" delay={1500}>
                <TouchableOpacity 
                  style={styles.loginLink}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Icon name="arrow-back" size={16} color={theme.colors.primary} />
                  <Text style={styles.loginLinkText}>
                    Já tem uma conta? <Text style={styles.loginLinkBold}>Entrar</Text>
                  </Text>
                </TouchableOpacity>
              </AnimatedView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.surface,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.surface,
    marginTop: theme.spacing.s,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    ...theme.shadows.l,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  input: {
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
    color: theme.colors.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.xs,
  },
  passwordInput: {
    flex: 1,
    padding: theme.spacing.m,
    fontSize: 16,
    color: theme.colors.text,
  },
  passwordHint: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.m,
    fontStyle: 'italic',
  },
  eyeButton: {
    padding: theme.spacing.m,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.s,
    marginRight: theme.spacing.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  termsText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  signupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    ...theme.shadows.m,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
  buttonIcon: {
    marginRight: theme.spacing.s,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.m,
  },
  loginLinkText: {
    color: theme.colors.text,
    fontSize: 14,
    marginLeft: theme.spacing.s,
  },
  loginLinkBold: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});