// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { loginCliente } from '../../services/database';
import { useAuth } from '../../context/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStackParamList';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const titleAnim = new Animated.Value(0);

  React.useEffect(() => {
    Animated.timing(titleAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    const emailTrim = (email ?? '').trim().toLowerCase();
    const senhaTrim = (senha ?? '').trim();

    if (!emailTrim || !senhaTrim) {
      Alert.alert('Erro', 'Preencha e-mail e senha.');
      return;
    }

    setIsLoading(true);
    
    try {
      const cliente = await loginCliente(emailTrim, senhaTrim);
      const displayName =
        (cliente && (cliente.nomeCompleto || cliente.apelido)) || cliente?.email || 'Usuário';
      
      login();
      
      Alert.alert('Login realizado', `Bem-vindo(a) ${displayName}!`);
    } catch (err: unknown) {
      console.error('[Login] loginCliente erro:', err);
      const message = err instanceof Error ? err.message : 'E-mail ou senha inválidos.';
      Alert.alert('Erro', message);
    } finally {
      setIsLoading(false);
    }
  };

  const titleScale = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const titleOpacity = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

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
        <View style={styles.logoContainer}>
          <Animated.Text 
            style={[
              styles.title,
              { 
                opacity: titleOpacity,
                transform: [{ scale: titleScale }] 
              }
            ]}
          >
            MEATPACK
          </Animated.Text>
          <Text style={styles.subtitle}>Controle de Estoque</Text>
        </View>

        <View style={styles.formContainer}>
          <AnimatedView from="bottom" delay={300}>
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={theme.colors.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!isLoading}
            />
          </AnimatedView>

          <AnimatedView from="bottom" delay={500}>
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={theme.colors.textLight}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              textContentType="password"
              editable={!isLoading}
            />
          </AnimatedView>

          {isLoading ? (
            <AnimatedView from="fade" delay={700}>
              <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
            </AnimatedView>
          ) : (
            <>
              <AnimatedView from="bottom" delay={700}>
                <TouchableOpacity style={styles.buttonLogin} onPress={handleLogin}>
                  <Text style={styles.buttonText}>Entrar</Text>
                </TouchableOpacity>
              </AnimatedView>

              <AnimatedView from="bottom" delay={900}>
                <TouchableOpacity
                  style={styles.buttonSignup}
                  onPress={() => navigation.navigate('Signup')}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonSignupText}>Criar uma conta</Text>
                </TouchableOpacity>
              </AnimatedView>
            </>
          )}
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.m,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: theme.colors.surface,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.surface,
    marginTop: theme.spacing.s,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    ...theme.shadows.l,
  },
  input: {
    width: '100%',
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
    color: theme.colors.text,
  },
  buttonLogin: {
    width: '100%',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    marginBottom: theme.spacing.s,
    ...theme.shadows.m,
  },
  buttonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSignup: {
    padding: theme.spacing.m,
    alignItems: 'center',
  },
  buttonSignupText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loading: {
    marginVertical: theme.spacing.m,
  },
});