// src/screens/common/AdicionarPedidoScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Alert, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, KeyboardAvoidingView, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native'; // REINCORPORADO: O único gatilho 100% seguro para recarga de tela
import { adicionarPedido, getFornecedores, getProdutos, Produto } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import ScreenWrapper from '../../components/ScreenWrapper';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'AdicionarPedido'>;

interface ItemPedido {
  produto: Produto | null;
  quantidade: string;
}

const AdicionarPedidoScreen: React.FC<Props> = ({ navigation, route }) => {
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState('');
  const [itens, setItens] = useState<ItemPedido[]>([{ produto: null, quantidade: '' }]);
  
  const [dataPedido, setDataPedido] = useState('');
  const [horaPedido, setHoraPedido] = useState('');

  const [modalCalendario, setModalCalendario] = useState(false);
  const [modalRelogio, setModalRelogio] = useState(false);
  const [relogioEtapa, setRelogioEtapa] = useState<'hora' | 'minuto'>('hora');
  const [horaEscolhida, setHoraEdit] = useState('');

  // 1. CARREGAMENTO BLINDADO: Imune a produtos velhos sem fornecedor ou erros nulos
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const carregarDadosSeguros = async () => {
        try {
          const fornecedoresBanco = await getFornecedores() || [];
          const produtosLista = await getProdutos() || [];
          
          if (!isActive) return;

          // Extração defensiva: Varre todos os produtos, ignora nulos e limpa os nomes
          const fornecedoresExtraidos = produtosLista
            .filter(p => p && p.fornecedor) 
            .map(p => String(p.fornecedor).trim())
            .filter(nome => nome.length > 0);

          // Limpa a lista nativa que vem do banco
          const fornecedoresDb = fornecedoresBanco
            .filter(f => f)
            .map(f => String(f).trim())
            .filter(f => f.length > 0);

          // Une as duas listas, remove as duplicatas matematicamente e organiza de A a Z
          const listaUnificada = [...new Set([...fornecedoresDb, ...fornecedoresExtraidos])].sort();

          setFornecedores(listaUnificada);
          setProdutosDisponiveis(produtosLista);
        } catch (error) {
          console.error('Erro na extração de fornecedores:', error);
        }
      };

      carregarDadosSeguros();

      return () => { isActive = false; }; // Limpa a memória se a tela fechar rápido
    }, [])
  );

  // 2. INICIALIZAÇÃO DE DATA E INTERCEPTAÇÃO DE ROTAS
  useEffect(() => {
    if (!dataPedido) {
      const agora = new Date();
      setDataPedido(agora.toLocaleDateString('pt-BR'));
      setHoraPedido(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }

    if (route.params?.produtoPreSelecionado) {
      const produtoVindo = route.params.produtoPreSelecionado;
      if (produtoVindo && produtoVindo.fornecedor) {
        setFornecedorSelecionado(String(produtoVindo.fornecedor).trim());
        setItens([{ produto: produtoVindo, quantidade: '1.0' }]);
        navigation.setParams({ produtoPreSelecionado: undefined });
      }
    }
  }, [route.params?.produtoPreSelecionado]);

  // 3. FILTRAGEM BLINDADA DE PRODUTOS DO FORNECEDOR
  useEffect(() => {
    if (fornecedorSelecionado) {
      const filtroLimpo = String(fornecedorSelecionado).trim();
      setProdutosFiltrados(
        produtosDisponiveis.filter(p => 
          p && p.fornecedor && String(p.fornecedor).trim() === filtroLimpo
        )
      );
    } else {
      setProdutosFiltrados([]);
    }
  }, [fornecedorSelecionado, produtosDisponiveis]);

  const handleFornecedorChange = (fornecedor: string) => {
    setFornecedorSelecionado(fornecedor);
    setItens([{ produto: null, quantidade: '' }]); // Reseta a lista se mudar a empresa
  };

  const handleQuantidadeChange = (index: number, quantidade: string) => {
    if (quantidade === '' || /^\d*\.?\d*$/.test(quantidade)) {
      const novosItens = [...itens];
      novosItens[index].quantidade = quantidade;
      setItens(novosItens);
    }
  };

  const handleAdicionarPedido = async () => {
    if (!fornecedorSelecionado) { Alert.alert('Erro', 'Selecione um fornecedor homologado.'); return; }
    if (!dataPedido || !horaPedido) { Alert.alert('Erro', 'Defina a data e o horário.'); return; }
    
    const itensValidos = itens.filter(item => item.produto && item.quantidade && parseFloat(item.quantidade) > 0);
    if (itensValidos.length === 0) { Alert.alert('Erro', 'Adicione pelo menos um item válido na compra.'); return; }

    try {
      const dataAgendadaComposta = `${dataPedido} às ${horaPedido}`;
      await adicionarPedido({
        data: dataAgendadaComposta,
        itens: itensValidos.map(item => ({
          produtoCodigo: item.produto!.codigo,
          quantidade: parseFloat(item.quantidade),
          precoUnitario: item.produto!.precoUnitario,
        })),
        status: 'aguardando',
        fornecedor: fornecedorSelecionado,
        notaFiscalRecebida: false,
      });
      
      Alert.alert('Sucesso', 'Pedido logístico agendado com sucesso!');
      
      // Reseta a tela inteira para o próximo uso
      setFornecedorSelecionado('');
      setItens([{ produto: null, quantidade: '' }]);
      
      navigation.navigate('AcompanharPedidos', { refresh: true });
    } catch (error) { 
      Alert.alert('Erro', 'Falha ao processar a gravação do pedido.'); 
    }
  };

  const selecionarDiaCalendario = (dia: number) => {
    const mesAno = new Date().toLocaleString('pt-BR', { month: '2-digit', year: 'numeric' });
    setDataPedido(`${dia < 10 ? '0' + dia : dia}/${mesAno}`);
    setModalCalendario(false);
  };

  const selecionarHoraRelogio = (valor: string) => {
    if (relogioEtapa === 'hora') {
      setHoraEdit(valor);
      setRelogioEtapa('minuto');
    } else {
      setHoraPedido(`${horaEscolhida}:${valor}`);
      setModalRelogio(false);
    }
  };

  const abrirSeletorRelogio = () => {
    setRelogioEtapa('hora');
    setModalRelogio(true);
  };

  const diasMock = Array.from({ length: 31 }, (_, i) => i + 1);
  const horasMock = Array.from({ length: 24 }, (_, i) => i < 10 ? `0${i}` : `${i}`);
  const minutosMock = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          <AnimatedView from="top">
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Adicionar Pedido</Text>
              <Text style={styles.pageDescription}>Defina o agendamento visual e adicione os itens de compra.</Text>
            </View>
          </AnimatedView>

          <AnimatedView from="bottom" delay={100}>
            <View style={styles.panelCard}>
              
              <View style={styles.rowGrid}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Previsão de Data</Text>
                  <TouchableOpacity style={styles.boxSeletorClick} onPress={() => setModalCalendario(true)}>
                    <Icon name="calendar-today" size={18} color="#666" />
                    <Text style={styles.boxSeletorTexto}>{dataPedido || "Selecionar Dia"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Previsão de Horário</Text>
                  <TouchableOpacity style={styles.boxSeletorClick} onPress={abrirSeletorRelogio}>
                    <Icon name="access-time" size={18} color="#666" />
                    <Text style={styles.boxSeletorTexto}>{horaPedido || "Definir Hora"}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Fornecedor Homologado</Text>
              <View style={styles.pickerContainerFornecedor}>
                <Picker 
                  selectedValue={fornecedorSelecionado} 
                  onValueChange={handleFornecedorChange} 
                  style={styles.picker}
                >
                  <Picker.Item label="--- Selecione o Fornecedor ---" value="" color="#888" />
                  {fornecedores.map((f, i) => (
                    <Picker.Item key={`fornecedor-${i}`} label={f} value={f} color="#333" />
                  ))}
                </Picker>
              </View>

              <Text style={styles.sectionTitle}>Itens da Ordem de Compra</Text>
              {itens.map((item, index) => (
                <View key={index} style={styles.itemCardContainer}>
                  <View style={styles.rowGrid}>
                    <View style={styles.flex7}>
                      <Text style={styles.label}>Produto</Text>
                      <View style={styles.pickerContainer}>
                        <Picker 
                          selectedValue={item.produto?.codigo || ''} 
                          onValueChange={(v) => {
                            const novosItens = [...itens];
                            novosItens[index].produto = produtosFiltrados.find(p => p.codigo === Number(v)) || null;
                            setItens(novosItens);
                          }} 
                          style={styles.picker} 
                          enabled={!!fornecedorSelecionado}
                        >
                          <Picker.Item label="Selecione o produto" value="" color="#888" />
                          {produtosFiltrados.map(p => (
                            <Picker.Item key={`produto-${p.codigo}`} label={`${p.descricao}`} value={p.codigo} color="#333" />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    <View style={styles.flex3}>
                      <Text style={styles.label}>Qtd (kg)</Text>
                      <TextInput 
                        style={styles.quantidadeInputCompacto} 
                        value={item.quantidade} 
                        onChangeText={(text) => handleQuantidadeChange(index, text)} 
                        keyboardType="numeric" 
                        placeholder="0.00" 
                      />
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity 
                style={[styles.addButtonCompacto, !fornecedorSelecionado && { opacity: 0.5 }]} 
                onPress={() => setItens([...itens, { produto: null, quantidade: '' }])} 
                disabled={!fornecedorSelecionado}
              >
                <Icon name="add" size={18} color={theme.colors.primary} />
                <Text style={styles.addButtonText}>Incluir Item</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.concluirButton} onPress={handleAdicionarPedido}>
                <Icon name="check-circle" size={22} color="#FFF" />
                <Text style={styles.concluirButtonText}>Concluir e Enviar Pedido</Text>
              </TouchableOpacity>
            </View>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL DE CALENDÁRIO */}
      <Modal visible={modalCalendario} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCardContainer}>
            <Text style={styles.modalCalendarioTitulo}>Selecione o Dia da Entrega</Text>
            <View style={styles.calendarioGrid}>
              {diasMock.map(dia => (
                <TouchableOpacity key={`dia-${dia}`} style={styles.diaItemBtn} onPress={() => selecionarDiaCalendario(dia)}>
                  <Text style={styles.diaItemTexto}>{dia}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.btnFecharModal} onPress={() => setModalCalendario(false)}>
              <Text style={styles.btnFecharModalTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE RELÓGIO ANALÓGICO */}
      <Modal visible={modalRelogio} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalCardContainer}>
            <Text style={styles.modalCalendarioTitulo}>
              {relogioEtapa === 'hora' ? 'Passo 1: Escolha a Hora' : 'Passo 2: Escolha o Minuto'}
            </Text>
            <ScrollView contentContainerStyle={styles.relogioGrid}>
              {relogioEtapa === 'hora' ? (
                horasMock.map(h => (
                  <TouchableOpacity key={`hora-${h}`} style={styles.relogioItemBtn} onPress={() => selecionarHoraRelogio(h)}>
                    <Text style={styles.relogioItemTexto}>{h}h</Text>
                  </TouchableOpacity>
                ))
              ) : (
                minutosMock.map(m => (
                  <TouchableOpacity key={`min-${m}`} style={[styles.relogioItemBtn, { backgroundColor: '#eef5ee' }]} onPress={() => selecionarHoraRelogio(m)}>
                    <Text style={[styles.relogioItemTexto, { color: 'green' }]}>{m} min</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.btnFecharModal} onPress={() => setModalRelogio(false)}>
              <Text style={styles.btnFecharModalTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScreenWrapper>
  );
};

export default AdicionarPedidoScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)' },
  contentContainer: { padding: theme.spacing.m, paddingBottom: 50 },
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.l, maxWidth: 700, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center', marginBottom: theme.spacing.xs },
  pageDescription: { fontSize: 14, color: theme.colors.textLight, textAlign: 'center', fontStyle: 'italic' },
  panelCard: { backgroundColor: theme.colors.surface, padding: 24, borderRadius: theme.borderRadius.m, width: '100%', maxWidth: 800, alignSelf: 'center', ...theme.shadows.s, borderWidth: 1, borderColor: '#dcdcdc' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.primary, marginBottom: 8, marginTop: 16 },
  itemCardContainer: { backgroundColor: '#fcfcfc', padding: 16, borderRadius: 8, marginBottom: theme.spacing.m, borderWidth: 1, borderColor: '#eee' },
  rowGrid: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  flex1: { flex: 1 }, flex7: { flex: 7 }, flex3: { flex: 3 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#444' },
  boxSeletorClick: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, padding: 12, backgroundColor: '#FFF', height: 48, gap: 8 },
  boxSeletorTexto: { fontSize: 14, color: '#2E2E2E', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, padding: 12, fontSize: 15, backgroundColor: '#FFF', height: 48 },
  pickerContainer: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, overflow: 'hidden', backgroundColor: '#FFF', height: 48, justifyContent: 'center' },
  pickerContainerFornecedor: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, overflow: 'hidden', backgroundColor: '#FFF', height: 48, justifyContent: 'center', width: '100%' },
  picker: { height: 48 },
  quantidadeInputCompacto: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, padding: 12, fontSize: 15, backgroundColor: '#FFF', color: '#000', height: 48, textAlign: 'center' },
  addButtonCompacto: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 6, marginVertical: 15, alignSelf: 'flex-start', borderStyle: 'dashed' },
  addButtonText: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 4, fontSize: 13 },
  concluirButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, padding: 14, borderRadius: 8, marginTop: 10, ...theme.shadows.s },
  concluirButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCardContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, width: '90%', maxWidth: 360 },
  modalCalendarioTitulo: { fontSize: 16, fontWeight: 'bold', color: '#8B0000', textAlign: 'center', marginBottom: 16 },
  calendarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  diaItemBtn: { width: 40, height: 40, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0' },
  diaItemTexto: { fontSize: 14, fontWeight: '600' },
  relogioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxHeight: 240 },
  relogioItemBtn: { width: 65, height: 45, backgroundColor: '#f0f0f5', justifyContent: 'center', alignItems: 'center', borderRadius: 6 },
  relogioItemTexto: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  btnFecharModal: { marginTop: 20, padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  btnFecharModalTexto: { color: '#666', fontWeight: 'bold' }
});