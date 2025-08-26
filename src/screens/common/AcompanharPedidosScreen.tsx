// src/screens/common/AcompanharPedidosScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  ImageBackground,
  Animated,
} from 'react-native';
import { listarPedidos, atualizarStatusPedido, atualizarNotaFiscalPedido, Pedido, getProdutos, Produto } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'AcompanharPedidos'>;

// Função auxiliar para formatar valores monetários com segurança
const formatCurrency = (value: number | undefined): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00';
  }
  return value.toFixed(2);
};

type TabType = 'abertos' | 'concluidos';

export default function AcompanharPedidosScreen({ navigation, route }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<TabType>('abertos');
  const [animacaoAba] = useState(new Animated.Value(0));

  const carregarDados = async () => {
    try {
      const [listaPedidos, listaProdutos] = await Promise.all([
        listarPedidos(),
        getProdutos()
      ]);
      setPedidos(listaPedidos);
      setProdutos(listaProdutos);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os pedidos.');
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (route.params?.refresh) {
      carregarDados();
      navigation.setParams({ refresh: false });
    }
  }, [route.params]);

  useEffect(() => {
    // Animação ao trocar de aba
    Animated.timing(animacaoAba, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [abaAtiva]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  };

  // Filtrar pedidos por status
  const pedidosAbertos = pedidos.filter(pedido => pedido.status === 'aguardando');
  const pedidosConcluidos = pedidos.filter(pedido => pedido.status === 'entregue');

  // Função para obter o nome do produto pelo código
  const obterNomeProduto = (codigo: number): string => {
    const produto = produtos.find(p => p.codigo === codigo);
    return produto ? produto.descricao : `Produto #${codigo}`;
  };

  const handleAtualizarStatus = async (id: number, status: 'aguardando' | 'entregue') => {
    try {
      await atualizarStatusPedido(id, status);
      Alert.alert('Sucesso', 'Status do pedido atualizado com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status do pedido.');
    }
  };

  const handleNotaFiscal = async (id: number, notaFiscalRecebida: boolean) => {
    try {
      await atualizarNotaFiscalPedido(id, notaFiscalRecebida);
      Alert.alert('Sucesso', 'Status da nota fiscal atualizado com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar nota fiscal:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status da nota fiscal.');
    }
  };

  const calcularValorTotal = (pedido: Pedido): number => {
    return pedido.itens.reduce((total, item) => {
      return total + (item.quantidade * (item.precoUnitario || 0));
    }, 0);
  };

  const renderItem = ({ item }: { item: Pedido }) => (
    <AnimatedView from="bottom">
      <View style={styles.pedidoContainer}>
        <View style={styles.pedidoHeader}>
          <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
          <View style={[styles.statusBadge, item.status === 'entregue' ? styles.statusEntregue : styles.statusAguardando]}>
            <Text style={styles.statusText}>
              {item.status === 'entregue' ? 'Entregue' : 'Aguardando'}
            </Text>
          </View>
        </View>

        <View style={styles.pedidoInfo}>
          <View style={styles.infoRow}>
            <Icon name="event" size={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>{item.data}</Text>
          </View>
          {item.horaEntrega && (
            <View style={styles.infoRow}>
              <Icon name="access-time" size={16} color={theme.colors.textLight} />
              <Text style={styles.infoText}>{item.horaEntrega}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Icon name="local-shipping" size={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>{item.fornecedor}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="attach-money" size={16} color={theme.colors.textLight} />
            <Text style={styles.infoText}>R$ {formatCurrency(calcularValorTotal(item))}</Text>
          </View>
        </View>

        <View style={styles.pedidoItens}>
          <Text style={styles.itensTitle}>Itens do Pedido:</Text>
          {item.itens.map((itemPedido, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemText}>
                • {itemPedido.quantidade} kg - {obterNomeProduto(itemPedido.produtoCodigo)}
              </Text>
              <Text style={styles.itemPrice}>
                R$ {formatCurrency(itemPedido.quantidade * (itemPedido.precoUnitario || 0))}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.pedidoActions}>
          {item.status === 'aguardando' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.entregueButton]}
              onPress={() => handleAtualizarStatus(item.id, 'entregue')}
            >
              <Icon name="check-circle" size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>Marcar como Entregue</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, item.notaFiscalRecebida ? styles.notaFiscalRecebida : styles.notaFiscalPendente]}
            onPress={() => handleNotaFiscal(item.id, !item.notaFiscalRecebida)}
          >
            <Icon name="receipt" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>
              {item.notaFiscalRecebida ? 'Nota Fiscal Recebida' : 'Nota Fiscal Pendente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedView>
  );

  const renderAbaVazia = () => (
    <AnimatedView from="fade">
      <View style={styles.emptyContainer}>
        <Icon 
          name={abaAtiva === 'abertos' ? "inventory" : "history"} 
          size={64} 
          color={theme.colors.textLight} 
        />
        <Text style={styles.emptyText}>
          {abaAtiva === 'abertos' 
            ? 'Nenhum pedido em aberto' 
            : 'Nenhum pedido concluído'
          }
        </Text>
        <Text style={styles.emptySubtext}>
          {abaAtiva === 'abertos' 
            ? 'Quando você fizer pedidos, eles aparecerão aqui.' 
            : 'Os pedidos concluídos aparecerão aqui.'
          }
        </Text>
      </View>
    </AnimatedView>
  );

  return (
    <ImageBackground 
      source={require('../../../assets/wood-background.jpg')}
      style={styles.background}
      blurRadius={1}
    >
      <View style={styles.container}>
        <AnimatedView from="top">
          <View style={styles.header}>
            <Text style={styles.title}>Acompanhar Pedidos</Text>
          </View>
        </AnimatedView>

        {/* Abas */}
        <AnimatedView from="top" delay={200}>
          <View style={styles.abasContainer}>
            <TouchableOpacity 
              style={[styles.aba, abaAtiva === 'abertos' && styles.abaAtiva]}
              onPress={() => setAbaAtiva('abertos')}
            >
              <Text style={[styles.abaTexto, abaAtiva === 'abertos' && styles.abaTextoAtiva]}>
                Em Aberto ({pedidosAbertos.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.aba, abaAtiva === 'concluidos' && styles.abaAtiva]}
              onPress={() => setAbaAtiva('concluidos')}
            >
              <Text style={[styles.abaTexto, abaAtiva === 'concluidos' && styles.abaTextoAtiva]}>
                Histórico ({pedidosConcluidos.length})
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedView>

        <FlatList
          data={abaAtiva === 'abertos' ? pedidosAbertos : pedidosConcluidos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={renderAbaVazia}
        />
      </View>
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
    backgroundColor: 'rgba(245, 245, 220, 0.9)',
  },
  header: {
    padding: theme.spacing.m,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: theme.borderRadius.l,
    borderBottomRightRadius: theme.borderRadius.l,
    ...theme.shadows.m,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.surface,
    textAlign: 'center',
  },
  abasContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.m,
    marginTop: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
    ...theme.shadows.s,
  },
  aba: {
    flex: 1,
    padding: theme.spacing.m,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  abaAtiva: {
    backgroundColor: theme.colors.primary,
  },
  abaTexto: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  abaTextoAtiva: {
    color: theme.colors.surface,
  },
  listContent: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  pedidoContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    ...theme.shadows.s,
  },
  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  pedidoId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.s,
  },
  statusAguardando: {
    backgroundColor: theme.colors.warning,
  },
  statusEntregue: {
    backgroundColor: theme.colors.success,
  },
  statusText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  pedidoInfo: {
    marginBottom: theme.spacing.m,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    marginLeft: theme.spacing.s,
    color: theme.colors.text,
  },
  pedidoItens: {
    marginBottom: theme.spacing.m,
  },
  itensTitle: {
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  itemText: {
    color: theme.colors.text,
    fontSize: 14,
    flex: 1,
  },
  itemPrice: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
  pedidoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.s,
    ...theme.shadows.s,
  },
  actionButtonText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: theme.spacing.xs,
  },
  entregueButton: {
    backgroundColor: theme.colors.success,
  },
  notaFiscalPendente: {
    backgroundColor: theme.colors.warning,
  },
  notaFiscalRecebida: {
    backgroundColor: theme.colors.success,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.m,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});