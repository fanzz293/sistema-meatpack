// src/screens/common/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import ScreenWrapper from '../../components/ScreenWrapper';

// @ts-ignore
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'HomeScreen'>;

export default function HomeScreen({ navigation, route }: Props) {
  const usuario = route.params?.usuarioLogado;
  const nomeExibicao = usuario ? usuario.nomeCompleto || usuario.apelido : 'Operador';

  const fundoMadeira = require('../../../assets/wood-background.jpg'); 

  return (
    <ScreenWrapper>
      <ImageBackground source={fundoMadeira} style={styles.background} resizeMode="cover">
        <View style={styles.overlayContainer}>
          
          <View style={styles.contentLimiter}>
            {/* HEADER DE BOAS-VINDAS */}
            <View style={styles.welcomeHeader}>
              <View>
                <Text style={styles.welcomeText}>Olá, {nomeExibicao}!</Text>
                <Text style={styles.subWelcome}>Painel Logístico Meatpack</Text>
              </View>
              <Icon name="account-circle" size={40} color={theme?.colors?.primary || '#7A1E1E'} />
            </View>

            {/* GRID OPERACIONAL REORGANIZADO */}
            <View style={styles.menuGrid}>
              
              {/* 1. CONSULTAR PRODUTO */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('ConsultarEstoque')}
              >
                <Icon name="inventory" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Consultar Produto</Text>
              </TouchableOpacity>

              {/* 2. CADASTRAR PRODUTO */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('CadastrarProduto')}
              >
                <Icon name="add-box" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Cadastrar Produto</Text>
              </TouchableOpacity>

              {/* 3. ADICIONAR PEDIDO */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('AdicionarPedido')}
              >
                <Icon name="add-shopping-cart" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Adicionar Pedido</Text>
              </TouchableOpacity>

              {/* 4. ACOMPANHAR PEDIDOS */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('AcompanharPedidos')}
              >
                <Icon name="assignment" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Acompanhar Pedidos</Text>
              </TouchableOpacity>

              {/* 5. REGISTRAR SAÍDA */}
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => navigation.navigate('RegistrarSaida')}
              >
                <Icon name="local-shipping" size={26} color={theme?.colors?.primary || '#7A1E1E'} style={styles.iconSpacing} />
                <Text style={styles.menuText}>Registrar Saída</Text>
              </TouchableOpacity>

              {/* 6. CONFIGURAÇÕES / SENHA */}
              <TouchableOpacity 
                style={[styles.menuItem, styles.configItem]} 
                onPress={() => navigation.navigate('Configuracoes', { usuarioAtual: usuario })}
              >
                <Icon name="settings" size={26} color="#555" style={styles.iconSpacing} />
                <Text style={styles.menuText}>Configurações de contas</Text>
              </TouchableOpacity>

            </View>

            {/* BOTÃO DE LOGOUT */}
            <TouchableOpacity 
              style={styles.btnLogout} 
              onPress={() => navigation.replace('Login')}
            >
              <Icon name="logout" size={18} color="#FFF" />
              <Text style={styles.btnLogoutTexto}>Desconectar do Sistema</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ImageBackground>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlayContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: theme?.spacing?.m || 16, justifyContent: 'center' },
  contentLimiter: { width: '100%', maxWidth: Platform.OS === 'web' ? 550 : '100%', alignSelf: 'center' },
  welcomeHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#e3e3e3',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4
  },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: theme?.colors?.primary || '#7A1E1E' },
  subWelcome: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  menuGrid: { flexDirection: 'column', gap: 10 },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    padding: 16, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#e0e0e0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
  },
  configItem: { backgroundColor: 'rgba(242, 242, 242, 0.98)', borderColor: '#ccc' },
  iconSpacing: { marginRight: 14 },
  menuText: { fontSize: 16, fontWeight: '600', color: theme?.colors?.text || '#333' },
  btnLogout: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#c62828', 
    padding: 12, 
    borderRadius: 6, 
    marginTop: 20, 
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 24
  },
  btnLogoutTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 }
});