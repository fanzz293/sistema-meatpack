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
  
  // Dicionário persistente localmente para as datas reais
  const [historicoDatasReais, setHistoricoDatasReais] = useState<Record<number, string>>({});

  useEffect(() => {
    navigation.setOptions({ headerLeft: () => null });
    carregarDatasPersistidas();
  }, []);

  // Carrega os carimbos salvos no aparelho assim que a tela abre
  const carregarDatasPersistidas = async () => {
    try {
      const salvas = await AsyncStorage.getItem('@meatpack:datas_reais_entrega');
      if (salvas) {
        setHistoricoDatasReais(JSON.parse(salvas));
      }
    } catch (e) {
      console.error('Erro ao ler datas reais do armazenamento', e);
    }
  };

  const carregarDados = async () => {
    try { 
      const [listaPedidos, listaProdutos] = await Promise.all([listarPedidos(), getProdutos()]);
      setPedidos(listaPedidos);
      setProdutos(listaProdutos);
    } catch (error) { 
      console.error(error); 
    }
  };

  useEffect(() => { carregarDados(); }, []);

  const handleMarcarEntregue = async (id: number) => {
    try {
      await atualizarStatusPedido(id, 'entregue'); 
      await carregarDados();
      Alert.alert('Sucesso', 'Mercadoria marcada como entregue com sucesso.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível dar baixa no status do pedido.');
    }
  };

  const handleMarcarNF = async (id: number, jaRecebida: boolean) => {
    if (jaRecebida) return;

    // CAPTURA ATÔMICA DO MOMENTO EXATO NO CLIQUE DA NOTA FISCAL
    const momentoExatoFechamento = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    try {
      await atualizarNotaFiscalPedido(id, true);
      
      // Salva no dicionário local e persiste no AsyncStorage do aparelho
      const novosCarimbos = { ...historicoDatasReais, [id]: momentoExatoFechamento };
      setHistoricoDatasReais(novosCarimbos);
      await AsyncStorage.setItem('@meatpack:datas_reais_entrega', JSON.stringify(novosCarimbos));

      await carregarDados();
      Alert.alert('Sucesso', `Ciclo encerrado! Registro imutável gravado em: ${momentoExatoFechamento}`);
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

  const pedidosPendentes = pedidos.filter(p => !(p.status === 'entregue' && p.notaFiscalRecebida));
  
  const pedidosHistorico = pedidos.filter(p => {
    const correspondeAba = p.status === 'entregue' && p.notaFiscalRecebida;
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
              <Text style={styles.pageDescription}>
                Conferência de cargas pendentes e auditoria temporal do histórico de recebimentos.
              </Text>
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
                      <Text style={styles.dataTexto}>
                        <Icon name="event" size={12} color="#666" /> Previsão Definida: {item.data}
                      </Text>
                    </View>
                    <Text style={styles.infoText}>Fornecedor: {item.fornecedor} | Total: R$ {calcularValorTotal(item).toFixed(2)}</Text>
                  </View>

                  <View style={styles.produtosMinilist}>
                    {item.itens.map((it, idx) => (
                      <Text key={idx} style={styles.miniItemTexto}>
                        • {it.quantidade} kg de {getNomeProduto(it.produtoCodigo)}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.actionRow}>
                    {item.status !== 'entregue' ? (
                      <TouchableOpacity style={styles.btnEntregue} onPress={() => handleMarcarEntregue(item.id)}>
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>Marcar Entregue</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.badgeSucesso}><Text style={{color: '#FFF', fontSize: 12}}>✓ Lote Recebido</Text></View>
                    )}
                    
                    <TouchableOpacity 
                      style={[styles.btnNF, item.notaFiscalRecebida && styles.btnNFDesativado]} 
                      onPress={() => handleMarcarNF(item.id, item.notaFiscalRecebida)}
                      disabled={item.notaFiscalRecebida}
                    >
                      <Icon name={item.notaFiscalRecebida ? "lock" : "assignment-turned-in"} size={14} color="#FFF" />
                      <Text style={{ color: '#FFF', fontSize: 13, marginLeft: 4 }}>
                        {item.notaFiscalRecebida ? 'NF Recebida' : 'NF Pendente'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          ) : (
            <AnimatedView from="bottom" style={{ flex: 1 }}>
              <View style={styles.searchBarContainer}>
                <Icon name="search" size={18} color="#666" />
                <TextInput 
                  style={styles.searchBarInput}
                  placeholder="Pesquisar entregas de um respectivo dia... (Ex: 18/06/2026)"
                  value={filtroData}
                  onChangeText={setFiltroData}
                />
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.hCell, { width: '10%' }]}>ID</Text>
                <Text style={[styles.hCell, { width: '25%' }]}>Previsão Acordada</Text>
                <Text style={[styles.hCell, { width: '30%' }]}>Entrega Real (Sistema)</Text>
                <Text style={[styles.hCell, { width: '35%' }]}>Produtos Lançados no Ciclo</Text>
              </View>
              
              <FlatList
                data={pedidosHistorico}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhum pedido finalizado encontrado para este dia.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.tableRow}>
                    <Text style={[styles.rCell, { width: '10%', fontWeight: 'bold' }]}>#{item.id}</Text>
                    <Text style={[styles.rCell, { width: '25%', color: '#777', fontSize: 11 }]}>{item.data}</Text>
                    
                    {/* LEITURA DO ARMAZENAMENTO COMPLEMENTAR ISOLADO DE ATUALIZAÇÕES DO BANCO */}
                    <Text style={[styles.rCell, { width: '30%', fontWeight: '600', color: theme.colors.success }]}>
                      {historicoDatasReais[item.id] || 'Data não gravada'} 
                    </Text>
                    
                    <View style={{ width: '35%', alignItems: 'flex-start', paddingLeft: 8, justifyContent: 'center' }}>
                      {item.itens.map((it, idx) => (
                        <Text key={idx} style={styles.tableProdText} numberOfLines={1}>
                          • {it.quantidade}kg - {getNomeProduto(it.produtoCodigo)}
                        </Text>
                      ))}
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
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.m, marginTop: 5 },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center' },
  pageDescription: { fontSize: 14, color: theme.colors.textLight, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
  abasContainer: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 8, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#dcdcdc' },
  aba: { flex: 1, padding: 14, alignItems: 'center' },
  abaAtiva: { backgroundColor: theme.colors.primary },
  abaTexto: { fontWeight: '600', color: theme.colors.text, fontSize: 13 },
  abaTextoAtiva: { color: '#FFF' },
  listContent: { paddingBottom: 100 },
  pedidoCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e3e3e3' },
  cardHeader: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8, marginBottom: 10 },
  pedidoId: { fontSize: 16, fontWeight: 'bold', color: theme.colors.primary },
  dataTexto: { fontSize: 12, color: '#555', marginTop: 4 },
  infoText: { fontSize: 14, color: '#444', fontWeight: '500' },
  produtosMinilist: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  miniItemTexto: { fontSize: 13, color: '#555', marginBottom: 2 },
  actionRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', alignItems: 'center' },
  btnEntregue: { backgroundColor: theme.colors.success, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  badgeSucesso: { backgroundColor: '#4caf50', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  btnNF: { backgroundColor: theme.colors.warning, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  btnNFDesativado: { backgroundColor: '#90a4ae', opacity: 0.7 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 12, marginBottom: 15, height: 44 },
  searchBarInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#000' },
  tableHeader: { flexDirection: 'row', backgroundColor: theme.colors.primary, padding: 12, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  hCell: { color: '#FFF', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  tableRow: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  rCell: { fontSize: 12, color: '#333', textAlign: 'center' },
  tableProdText: { fontSize: 11, color: '#444', textAlign: 'left' },
  emptyText: { textAlign: 'center', padding: 30, color: theme.colors.textLight, fontStyle: 'italic' },
  floatingBottomRightBtn: { position: 'absolute', bottom: 20, right: 20, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, zIndex: 9999 },
  floatingBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 14 }
});