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
    cpf: '',
    email: '',
    telefone: '',
  });
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    if (!aceitaTermos) {
      Alert.alert('Atenção', 'Você precisa aceitar os termos de uso.');
      return;
    }

    setIsLoading(true);
    
    try {
      await addCliente({ ...formData, aceitaTermos });
      Alert.alert('Sucesso', 'Cadastro realizado com sucesso!');
      navigation.navigate('Login');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      Alert.alert('Erro', error.message || 'Não foi possível realizar o cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  // Definir os campos do formulário com suas propriedades
  const formFields = [
    { field: 'apelido', label: 'Apelido', placeholder: 'Como quer ser chamado', keyboardType: 'default' as const },
    { field: 'nomeCompleto', label: 'Nome Completo', placeholder: 'Seu nome completo', keyboardType: 'default' as const },
    { field: 'email', label: 'E-mail', placeholder: 'seu@email.com', keyboardType: 'email-address' as const },
    { field: 'cpf', label: 'CPF', placeholder: '000.000.000-00', keyboardType: 'numeric' as const },
    { field: 'telefone', label: 'Telefone', placeholder: '(00) 00000-0000', keyboardType: 'phone-pad' as const },
    { field: 'endereco', label: 'Endereço', placeholder: 'Seu endereço completo', keyboardType: 'default' as const },
    { field: 'senha', label: 'Senha', placeholder: 'Sua senha secreta', keyboardType: 'default' as const, secureTextEntry: true },
  ];

  return (
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
          <AnimatedView from="top" delay={200}>
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
                  secureTextEntry={item.secureTextEntry || false}
                  keyboardType={item.keyboardType} // Correção aplicada aqui
                  autoCapitalize={item.field === 'email' ? 'none' : 'words'}
                />
              </AnimatedView>
            ))}

            <AnimatedView from="bottom" delay={1000}>
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

            <AnimatedView from="bottom" delay={1200}>
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

            <AnimatedView from="bottom" delay={1400}>
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
  );
}

const styles = StyleSheet.create({
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