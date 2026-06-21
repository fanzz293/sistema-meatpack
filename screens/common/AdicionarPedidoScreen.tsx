// src/screens/common/AdicionarPedidoScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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
  
  // ESTADOS PARA AGENDAMENTO MANUAL EDITÁVEL
  const [dataPedido, setDataPedido] = useState('');
  const [horaPedido, setHoraPedido] = useState('');

  useEffect(() => {
    // Sugere a data e hora de hoje como placeholder inicial, mas deixa 100% editável
    const agora = new Date();
    setDataPedido(agora.toLocaleDateString('pt-BR'));
    setHoraPedido(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

    const inicializarFormulario = async () => {
      try {
        const fornecedoresLista = await getFornecedores();
        const produtosLista = await getProdutos();
        setFornecedores(fornecedoresLista);
        setProdutosDisponiveis(produtosLista);

        if (route.params?.produtoPreSelecionado) {
          const produtoVindo = route.params.produtoPreSelecionado;
          if (produtoVindo.fornecedor) {
            setFornecedorSelecionado(produtoVindo.fornecedor);
            setProdutosFiltrados(produtosLista.filter(p => p.fornecedor === produtoVindo.fornecedor));
            setItens([{ produto: produtoVindo, quantidade: '1.0' }]);
          }
        }
      } catch (error) { console.error(error); }
    };
    inicializarFormulario();
  }, [route.params]);

  const handleFornecedorChange = (fornecedor: string) => {
    setFornecedorSelecionado(fornecedor);
    setProdutosFiltrados(produtosDisponiveis.filter(p => p.fornecedor ===  fornecedor));
    setItens([{ produto: null, quantidade: '' }]);
  };

  const handleQuantidadeChange = (index: number, quantidade: string) => {
    if (quantidade === '' || /^\d*\.?\d*$/.test(quantidade)) {
      const novosItens = [...itens];
      novosItens[index].quantidade = quantidade; // CORRIGIDO VARIÁVEL
      setItens(novosItens);
    }
  };

  const handleAdicionarPedido = async () => {
    if (!fornecedorSelecionado) { Alert.alert('Erro', 'Selecione um fornecedor.'); return; }
    if (!dataPedido || !horaPedido) { Alert.alert('Erro', 'Defina a previsão de data e horário para a entrega.'); return; }
    
    const itensValidos = itens.filter(item => item.produto && item.quantidade && parseFloat(item.quantidade) > 0);
    if (itensValidos.length === 0) { Alert.alert('Erro', 'Adicione pelo menos um item válido.'); return; }

    try {
      // Consolida o agendamento manual digitado pelo operador no input
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
      Alert.alert('Sucesso', 'Pedido agendado com sucesso!');
      navigation.navigate('AcompanharPedidos', { refresh: true });
    } catch (error) { Alert.alert('Erro', 'Falha ao processar o pedido.'); }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <AnimatedView from="top">
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Adicionar Pedido</Text>
              <Text style={styles.pageDescription}>Defina a previsão de entrega e adicione os itens do fornecedor.</Text>
            </View>
          </AnimatedView>

          <AnimatedView from="bottom" delay={150}>
            <View style={styles.panelCard}>
              
              {/* INPUTS DE AGENDAMENTO MANUAL LADO A LADO */}
              <View style={styles.rowGrid}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Previsão de Data</Text>
                  <TextInput style={styles.input} value={dataPedido} onChangeText={setDataPedido} placeholder="Ex: 22/06/2026" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Previsão de Horário</Text>
                  <TextInput style={styles.input} value={horaPedido} onChangeText={setHoraPedido} placeholder="Ex: 14:30" />
                </View>
              </View>

              <Text style={styles.sectionTitle}>Fornecedor Homologado</Text>
              <View style={styles.pickerContainerFornecedor}>
                <Picker selectedValue={fornecedorSelecionado} onValueChange={handleFornecedorChange} style={styles.picker}>
                  <Picker.Item label="Selecione um fornecedor" value="" />
                  {fornecedores.map((f, i) => <Picker.Item key={i} label={f} value={f} />)}
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
                          <Picker.Item label="Selecione" value="" />
                          {produtosFiltrados.map(p => <Picker.Item key={p.codigo} label={`${p.descricao}`} value={p.codigo} />)}
                        </Picker>
                      </View>
                    </View>

                    <View style={styles.flex3}>
                      <Text style={styles.label}>Qtd (kg)</Text>
                      <TextInput style={styles.quantidadeInputCompacto} value={item.quantidade} onChangeText={(text) => handleQuantidadeChange(index, text)} keyboardType="numeric" placeholder="0.00" />
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addButtonCompacto} onPress={() => setItens([...itens, { produto: null, quantidade: '' }])} disabled={!fornecedorSelecionado}>
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
  flex1: { flex: 1 },
  flex7: { flex: 7 },
  flex3: { flex: 3 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#444' },
  input: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, padding: 12, fontSize: 15, backgroundColor: '#FFF', height: 48 },
  pickerContainer: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, overflow: 'hidden', backgroundColor: '#FFF', height: 48, justifyContent: 'center' },
  pickerContainerFornecedor: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, overflow: 'hidden', backgroundColor: '#FFF', height: 48, justifyContent: 'center', width: '100%' },
  picker: { height: 48 },
  quantidadeInputCompacto: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, padding: 12, fontSize: 15, backgroundColor: '#FFF', color: '#000', height: 48, textAlign: 'center' },
  addButtonCompacto: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 6, marginVertical: 15, alignSelf: 'flex-start', borderStyle: 'dashed' },
  addButtonText: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 4, fontSize: 13 },
  concluirButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.success, padding: 14, borderRadius: 8, marginTop: 10, ...theme.shadows.s },
  concluirButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});