// src/screens/common/HomeScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import ScreenWrapper from '../../components/ScreenWrapper'; // IMPORTADO
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeScreen'>;

export default function HomeScreen({ navigation }: Props) {
  const { logout, user } = useAuth();

  const menuItems = [
    { title: 'Consultar Estoque', icon: 'inventory-2', screen: 'ConsultarEstoque', color: '#8B0000' },
    { title: 'Cadastrar Produto', icon: 'add-box', screen: 'CadastrarProduto', color: '#D2691E' },
    { title: 'Adicionar Pedido', icon: 'add-shopping-cart', screen: 'AdicionarPedido', color: '#A52A2A' },
    { title: 'Acompanhar Pedidos', icon: 'list-alt', screen: 'AcompanharPedidos', color: '#CD853F', params: { refresh: false } },
    { title: 'Registrar Saída', icon: 'remove-circle-outline', screen: 'RegistrarSaida', color: '#8B4513' },
  ];

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={Platform.OS === 'web'}>
        <View style={styles.container}>
          <AnimatedView from="top" delay={100}>
            <View style={styles.header}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.nome?.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.greeting}>Olá, {user?.nome}</Text>
              </View>
              <Text style={styles.title}>MEATPACK</Text>
              <Text style={styles.subtitle}>Gestão de Estoque</Text>
            </View>
          </AnimatedView>

          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <AnimatedView key={item.title} from="left" delay={200 + index * 100}>
                <TouchableOpacity
                  style={[styles.menuItem, { backgroundColor: item.color }]}
                  onPress={() => navigation.navigate(item.screen as any, item.params || {})}
                >
                  <Icon name={item.icon as any} size={28} color="#FFF" style={styles.menuIcon} />
                  <Text style={styles.menuText}>{item.title}</Text>
                </TouchableOpacity>
              </AnimatedView>
            ))}
          </View>

          <AnimatedView from="bottom" delay={700}>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Icon name="exit-to-app" size={20} color="#FFF" />
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          </AnimatedView>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  container: { width: '100%', alignItems: 'center', padding: theme.spacing.m, paddingTop: Platform.OS === 'web' ? theme.spacing.xxl * 2 : theme.spacing.m },
  header: { alignItems: 'center', marginBottom: theme.spacing.xxl },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.m },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.s },
  avatarText: { color: theme.colors.surface, fontSize: 18, fontWeight: 'bold' },
  greeting: { color: theme.colors.surface, fontSize: 16 },
  title: { fontSize: 42, fontWeight: '800', color: theme.colors.surface, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 10, letterSpacing: 2 },
  subtitle: { fontSize: 18, color: theme.colors.surface, marginTop: theme.spacing.s },
  menuContainer: { width: '100%', maxWidth: 500, marginBottom: theme.spacing.xl },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.l, borderRadius: theme.borderRadius.l, marginBottom: theme.spacing.m, ...theme.shadows.m },
  menuIcon: { marginRight: theme.spacing.m },
  menuText: { color: theme.colors.surface, fontSize: 18, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: theme.spacing.m, borderRadius: theme.borderRadius.m, ...theme.shadows.s },
  logoutText: { color: theme.colors.surface, fontSize: 16, fontWeight: '600', marginLeft: theme.spacing.s }
});