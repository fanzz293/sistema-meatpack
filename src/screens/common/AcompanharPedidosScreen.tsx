// src/screens/common/AcompanharPedidosScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { listarPedidos, atualizarStatusPedido, atualizarNotaFiscalPedido, Pedido, getProdutos, Produto } from '../../services/database';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import ScreenWrapper from '../../components/ScreenWrapper';
import Icon from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = NativeStackScreenProps<RootStackParamList, 'AcompanharPedidos'>;

export default function AcompanharPedidosScreen({ navigation }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'abertos' | 'concluidos'>('abertos');
  const [filtroData, setFiltroData] = useState('');
  const [historicoDatasReais, setHistoricoDatasReais] = useState<Record<number, string>>({});

  useEffect(() => {
    navigation.setOptions({ headerLeft: () => null });
    carregarDatasPersistidas();
    carregarDados();
  }, []);

  const carregarDatasPersistidas = async () => {
    try {
      const salvas = await AsyncStorage.getItem('@meatpack:datas_reais_entrega');
      if (salvas) setHistoricoDatasReais(JSON.parse(salvas));
    } catch (e) {}
  };

  const carregarDados = async () => {
    try { 
      const [listaPedidos, listaProdutos] = await Promise.all([listarPedidos(), getProdutos()]);
      setPedidos(listaPedidos);
      setProdutos(listaProdutos);
    } catch (error) {}
  };

  const handleMarcarEntregue = async (id: number) => {
    try {
      await atualizarStatusPedido(id, 'entregue'); 
      await carregarDados();
      Alert.alert('Sucesso', 'Mercadoria marcada como entregue. Movida para o histórico.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível dar baixa no pedido.');
    }
  };

  const handleMarcarNF = async (id: number, jaRecebida: boolean) => {
    if (jaRecebida) return;
    const momentoExatoFechamento = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    try {
      await atualizarNotaFiscalPedido(id, true);
      const novosCarimbos = { ...historicoDatasReais, [id]: momentoExatoFechamento };
      setHistoricoDatasReais(novosCarimbos);
      await AsyncStorage.setItem('@meatpack:datas_reais_entrega', JSON.stringify(novosCarimbos));
      await carregarDados();
      
      // CORRIGIDO: Redireciona para o estoque após a validação da Nota Fiscal
      Alert.alert('Ciclo Encerrado', 'Nota Fiscal validada com sucesso!', [
        {
          text: 'Ver Estoque',
          onPress: () => {
            navigation.navigate('ConsultarEstoque', { infoMessage: 'Carga e NF auditadas com sucesso!' });
          }
        }
      ]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível validar a Nota Fiscal.');
    }
  };

  const calcularValorTotal = (pedido: Pedido): number => {
    return pedido.itens.reduce((total, item) => total + (item.quantidade * (item.precoUnitario || 0)), 0);
  };

  const getNomeProduto = (codigo: number): string => {
    const prod = produtos.find(p => p.codigo === codigo);
    return prod ? prod.descricao : `Produto #${codigo}`;
  };

  const pedidosPendentes = pedidos.filter(p => p.status === 'aguardando');
  
  const pedidosHistorico = pedidos.filter(p => {
    const correspondeAba = p.status === 'entregue';
    if (!correspondeAba) return false;
    
    const dataReal = historicoDatasReais[p.id] || '';
    if (filtroData) {
      const termo = filtroData.toLowerCase();
      const dataPrevisao = p.data ? p.data.toLowerCase() : '';
      return dataPrevisao.includes(termo) || dataReal.toLowerCase().includes(termo);
    }
    return true;
  });

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.panelCardContainer}>
          <AnimatedView from="top">
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Acompanhar Pedidos</Text>
              <Text style={styles.pageDescription}>Conferência de cargas pendentes e auditoria temporal.</Text>
            </View>
          </AnimatedView>

          <AnimatedView from="top" delay={100}>
            <View style={styles.abasContainer}>
              <TouchableOpacity style={[styles.aba, abaAtiva === 'abertos' && styles.abaAtiva]} onPress={() => setAbaAtiva('abertos')}>
                <Text style={[styles.abaTexto, abaAtiva === 'abertos' && styles.abaTextoAtiva]}>Pendentes / Em Aberto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.aba, abaAtiva === 'concluidos' && styles.abaAtiva]} onPress={() => setAbaAtiva('concluidos')}>
                <Text style={[styles.abaTexto, abaAtiva === 'concluidos' && styles.abaTextoAtiva]}>Histórico de Entregas</Text>
              </TouchableOpacity>
            </View>
          </AnimatedView>

          {abaAtiva === 'abertos' ? (
            <FlatList
              data={pedidosPendentes}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.pedidoCard}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pedidoId}>Pedido #{item.id}</Text>
                      <Text style={styles.dataTexto}><Icon name="event" size={12} color="#666" /> Previsão: {item.data}</Text>
                    </View>
                    <Text style={styles.infoText}>Fornecedor: {item.fornecedor} | Total: R$ {calcularValorTotal(item).toFixed(2)}</Text>
                  </View>

                  <View style={styles.produtosMinilist}>
                    {item.itens.map((it, idx) => (
                      <Text key={idx} style={styles.miniItemTexto}>• {it.quantidade} kg de {getNomeProduto(it.produtoCodigo)}</Text>
                    ))}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.btnEntregue} onPress={() => handleMarcarEntregue(item.id)}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Marcar Entregue</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          ) : (
            <AnimatedView from="bottom" style={{ flex: 1 }}>
              <View style={styles.searchBarContainer}>
                <Icon name="search" size={18} color="#666" />
                <TextInput style={styles.searchBarInput} placeholder="Pesquisar histórico por data (Ex: 18/06/2026)" value={filtroData} onChangeText={setFiltroData} />
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.hCell, { width: '15%' }]}>ID</Text>
                <Text style={[styles.hCell, { width: '35%' }]}>Entrega Real</Text>
                <Text style={[styles.hCell, { width: '25%' }]}>NF Status</Text>
                <Text style={[styles.hCell, { width: '25%' }]}>Ação</Text>
              </View>
              
              <FlatList
                data={pedidosHistorico}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum histórico encontrado.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.tableRow}>
                    <Text style={[styles.rCell, { width: '15%', fontWeight: 'bold' }]}>#{item.id}</Text>
                    <Text style={[styles.rCell, { width: '35%', color: theme.colors.success, fontWeight: '600' }]}>{item.horaEntrega || 'Entregue'}</Text>
                    <Text style={[styles.rCell, { width: '25%', fontSize: 11 }]}>{item.notaFiscalRecebida ? 'NF Recebida' : 'NF Pendente'}</Text>
                    
                    <View style={{ width: '25%', alignItems: 'center' }}>
                      <TouchableOpacity 
                        style={[styles.btnNFTable, item.notaFiscalRecebida && styles.btnNFDesativado]} 
                        onPress={() => handleMarcarNF(item.id, item.notaFiscalRecebida)}
                        disabled={item.notaFiscalRecebida}
                      >
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>
                          {item.notaFiscalRecebida ? 'Fechado' : 'Validar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </AnimatedView>
          )}
        </View>

        <TouchableOpacity style={styles.floatingBottomRightBtn} onPress={() => navigation.navigate('HomeScreen')}>
          <Icon name="home" size={20} color="#FFF" />
          <Text style={styles.floatingBtnText}>Voltar ao Menu</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)', padding: theme.spacing.m },
  panelCardContainer: { flex: 1, width: '100%', maxWidth: 800, alignSelf: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.m },
  title: { fontSize: 26, fontWeight: 'bold', color: theme.colors.primary },
  pageDescription: { fontSize: 13, color: theme.colors.textLight, fontStyle: 'italic', marginTop: 2 },
  abasContainer: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 8, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#dcdcdc' },
  aba: { flex: 1, padding: 12, alignItems: 'center' },
  abaAtiva: { backgroundColor: theme.colors.primary },
  abaTexto: { fontWeight: '600', color: theme.colors.text, fontSize: 13 },
  abaTextoAtiva: { color: '#FFF' },
  listContent: { paddingBottom: 100 },
  pedidoCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e3e3e3' },
  cardHeader: { flexDirection: 'column', paddingBottom: 6, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pedidoId: { fontSize: 15, fontWeight: 'bold', color: theme.colors.primary },
  dataTexto: { fontSize: 12, color: '#555', marginTop: 2 },
  infoText: { fontSize: 13, color: '#444', fontWeight: '500', marginTop: 4 },
  produtosMinilist: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 6, marginBottom: 10 },
  miniItemTexto: { fontSize: 12, color: '#555' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  btnEntregue: { backgroundColor: theme.colors.success, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  btnNFTable: { backgroundColor: theme.colors.warning, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4 },
  btnNFDesativado: { backgroundColor: '#90a4ae', opacity: 0.6 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 12, marginBottom: 15, height: 40 },
  searchBarInput: { flex: 1, marginLeft: 8, fontSize: 13 },
  tableHeader: { flexDirection: 'row', backgroundColor: theme.colors.primary, padding: 10, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  hCell: { color: '#FFF', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  tableRow: { flexDirection: 'row', backgroundColor: '#FFF', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  rCell: { fontSize: 12, color: '#333', textAlign: 'center' },
  emptyText: { textAlign: 'center', padding: 20, color: theme.colors.textLight, fontStyle: 'italic' },
  floatingBottomRightBtn: { position: 'absolute', bottom: 15, right: 15, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, zIndex: 9999 },
  floatingBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 13 }
});