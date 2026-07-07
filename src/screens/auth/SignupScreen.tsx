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
import ScreenWrapper from '../../components/ScreenWrapper'; // IMPORTADO
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

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

  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpf.charAt(10));
  };

  const validatePassword = (password: string): boolean => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
  };

  const handleSignup = async () => {
    if (!aceitaTermos) {
      exibirAlerta('Atenção', 'Você precisa aceitar os termos de uso.');
      return;
    }
    if (!validatePassword(formData.senha)) {
      exibirAlerta('Senha inválida', 'A senha deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, 1 número e 1 símbolo.');
      return;
    }
    if (!validateCPF(formData.cpf)) {
      exibirAlerta('CPF inválido', 'Por favor, insira um CPF válido.');
      return;
    }

    setIsLoading(true);
    try {
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
      <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <AnimatedView from="top">
            <View style={styles.header}>
              <Text style={styles.title}>Criar Conta</Text>
              <Text style={styles.subtitle}>Preencha seus dados para começar</Text>
            </View>
          </AnimatedView>

          <View style={styles.formContainer}>
            {formFields.map((item, index) => (
              <AnimatedView key={item.field} from="right" delay={200 + index * 50}>
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

            <AnimatedView from="bottom" delay={700}>
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
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
              </View>
              <Text style={styles.passwordHint}>A senha deve conter pelo menos 8 caracteres, com maiúsculas, minúsculas, número e símbolo.</Text>
            </AnimatedView>

            <AnimatedView from="bottom" delay={800}>
              <TouchableOpacity style={styles.termsContainer} onPress={() => setAceitaTermos(!aceitaTermos)}>
                <View style={[styles.checkbox, aceitaTermos && styles.checkboxChecked]}>
                  {aceitaTermos && <Icon name="check" size={16} color="#FFF" />}
                </View>
                <Text style={styles.termsText}>Aceito os termos de uso</Text>
              </TouchableOpacity>
            </AnimatedView>

            <AnimatedView from="bottom" delay={900}>
              <TouchableOpacity style={[styles.signupButton, isLoading && styles.signupButtonDisabled]} onPress={handleSignup} disabled={isLoading}>
                <Icon name="person-add" size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.signupButtonText}>{isLoading ? 'Criando conta...' : 'Criar Conta'}</Text>
              </TouchableOpacity>
            </AnimatedView>

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