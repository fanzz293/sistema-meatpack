// src/screens/common/RegistrarSaidaScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { getProdutos, registrarSaidaProduto, Produto } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'RegistrarSaida'>;

const MOTIVOS_SAIDA = [
  'Preparo para a área de vendas',
  'Troca com fornecedor por avaria',
  'Troca com fornecedor por erro na entrega',
  'Reservado para cliente'
];

interface RowSaida {
  produto: Produto | null;
  quantidade: string;
  motivo: string;
}

const exibirAlerta = (titulo: string, mensagem: string, botoes?: { text: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    const botaoOk = botoes?.find(b => b.onPress);
    if (botaoOk && botaoOk.onPress) botaoOk.onPress();
  } else {
    Alert.alert(titulo, mensagem, botoes);
  }
};

const RegistrarSaidaScreen: React.FC<Props> = ({ navigation }) => {
  const [produtosComEstoque, setProdutosComEstoque] = useState<Produto[]>([]);
  const [itensSaida, setItensSaida] = useState<RowSaida[]>([{ produto: null, quantidade: '', motivo: '' }]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [loading, setLoading] = useState(false);

  // Carrega os produtos disponíveis sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      const carregarProdutos = async () => {
        try {
          const lista = await getProdutos() || [];
          setProdutosComEstoque(lista.filter(p => p && p.quantidade > 0));
        } catch (e) {
          console.error(e);
        }
      };
      carregarProdutos();
    }, [])
  );

  const handleRowChange = (index: number, field: keyof RowSaida, value: any) => {
    const novos = [...itensSaida];
    novos[index] = { ...novos[index], [field]: value };
    setItensSaida(novos);
  };

  const handleAdicionarItemForm = () => {
    setItensSaida([...itensSaida, { produto: null, quantidade: '', motivo: '' }]);
  };

  const handleRemoverItemForm = (index: number) => {
    if (itensSaida.length === 1) return;
    setItensSaida(itensSaida.filter((_, i) => i !== index));
  };

  const handleAbrirBuscador = (index: number) => {
    setIndiceAtivo(index);
    setTermoBusca('');
    setModalVisivel(true);
  };

  // Processamento do lote de saídas e Redirecionamento com Callback
  const handleRegistrarSaida = async () => {
    if (loading) return;

    // 1. Validação estrita de cada linha do lote
    for (let i = 0; i < itensSaida.length; i++) {
      const item = itensSaida[i];
      if (!item.produto || !item.quantidade.trim() || !item.motivo) {
        exibirAlerta('Campos Obrigatórios', `Por favor, preencha todos os campos do item na linha #${i + 1}.`);
        return;
      }

      const qtdDigitada = parseFloat(item.quantidade);
      if (isNaN(qtdDigitada) || qtdDigitada <= 0) {
        exibirAlerta('Quantidade Inválida', `Informe um valor válido maior que 0 no item #${i + 1}.`);
        return;
      }

      // CORRIGIDO: Agora usa a propriedade correta '.quantidade' do seu banco de dados
      if (qtdDigitada > item.produto.quantidade) {
        exibirAlerta('Estoque Insuficiente', `A quantidade da linha #${i + 1} excede o limite disponível (${item.produto.quantidade} kg).`);
        return;
      }
    }

    setLoading(true);

    try {
      // 2. Grava item por item no banco de dados
      for (const item of itensSaida) {
        if (item.produto) {
          await registrarSaidaProduto(item.produto.codigo, parseFloat(item.quantidade), item.motivo);
        }
      }
      
      // 3. Alerta com Callback e Redirecionamento Válido para o AppNavigator
      exibirAlerta('Sucesso', 'Baixa de mercadorias salva com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            setItensSaida([{ produto: null, quantidade: '', motivo: '' }]);
            // Usando 'infoMessage' que é aceito pelo tipo da rota no seu AppNavigator
            navigation.navigate('ConsultarEstoque', { infoMessage: 'Saída de estoque registrada com sucesso!' });
          }
        }
      ]);

    } catch (error) {
      exibirAlerta('Erro', 'Não foi possível salvar os registros de saída.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <AnimatedView from="top" duration={450}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Registrar Saída</Text>
            <Text style={styles.pageDescription}>Realize baixas imediatas e descartes em lote no inventário físico.</Text>
          </View>
        </AnimatedView>

        <AnimatedView from="bottom" delay={100} duration={500}>
          <View style={styles.panelCardContainer}>
            {itensSaida.map((item, index) => (
              <View key={index} style={styles.itemLoteCard}>
                <View style={styles.rowCardHeader}>
                  <Text style={styles.itemTitle}>Saída #{index + 1}</Text>
                  {itensSaida.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoverItemForm(index)}>
                      <Icon name="delete" size={18} color="#d32f2f" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.label}>Produto de Estoque</Text>
                <TouchableOpacity style={styles.selecionarButton} onPress={() => handleAbrirBuscador(index)}>
                  <Text style={item.produto ? styles.txtBtnAtivo : styles.txtBtnPlaceholder}>
                    {item.produto ? `${item.produto.descricao} (Estoque: ${item.produto.quantidade} kg)` : 'Selecionar Produto'}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, styles.flex4]}>
                    <Text style={styles.label}>Quantidade (kg)</Text>
                    <TextInput style={styles.input} placeholder="0.00" value={item.quantidade} onChangeText={(text) => handleRowChange(index, 'quantidade', text)} keyboardType="numeric" />
                  </View>

                  <View style={[styles.inputGroup, styles.flex6]}>
                    <Text style={styles.label}>Motivo da Saída</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={item.motivo} onValueChange={(val) => handleRowChange(index, 'motivo', val)} style={styles.picker}>
                        <Picker.Item label="Selecione o motivo..." value="" color="#888" />
                        {MOTIVOS_SAIDA.map((m, idx) => <Picker.Item key={idx} label={m} value={m} />)}
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.btnIncluirLinha} onPress={handleAdicionarItemForm}>
              <Icon name="add" size={18} color={theme.colors.primary} />
              <Text style={styles.btnIncluirLinhaTexto}>Incluir outro item de saída</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleRegistrarSaida} disabled={loading}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>
                {loading ? 'Processando baixa...' : 'Confirmar e Salvar Saída'}
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedView>
      </ScrollView>

      {/* MODAL DE SELEÇÃO DE PRODUTO */}
      <Modal visible={modalVisivel} transparent={true} animationType="fade" onRequestClose={() => setModalVisivel(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Produto</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}><Icon name="close" size={24} /></TouchableOpacity>
            </View>
            <TextInput style={styles.buscaInput} placeholder="Buscar por descrição..." value={termoBusca} onChangeText={setTermoBusca} />
            <FlatList
              data={produtosComEstoque.filter(p => p.descricao.toLowerCase().includes(termoBusca.toLowerCase()))}
              keyExtractor={(item) => item.codigo.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.produtoItem} onPress={() => {
                  if (indiceAtivo !== null) handleRowChange(indiceAtivo, 'produto', item);
                  setModalVisivel(false);
                }}>
                  <Text style={styles.produtoNome}>{item.descricao}</Text>
                  <Text style={styles.produtoDetalhes}>Código: #{item.codigo} | Estoque Atual: {item.quantidade} kg</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

export default RegistrarSaidaScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)' },
  contentContainer: { padding: theme.spacing.m, paddingBottom: 40 },
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.l, maxWidth: 700, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center', marginBottom: theme.spacing.xs },
  pageDescription: { fontSize: 14, color: theme.colors.textLight, textAlign: 'center', fontStyle: 'italic' },
  panelCardContainer: { backgroundColor: '#FFF', padding: 20, borderRadius: theme.borderRadius.m, width: '100%', maxWidth: 800, alignSelf: 'center', ...theme.shadows.s, borderWidth: 1, borderColor: '#dcdcdc' },
  itemLoteCard: { backgroundColor: '#fcfcfc', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 15 },
  rowCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 },
  itemTitle: { fontSize: 13, fontWeight: 'bold', color: '#666' },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  selecionarButton: { borderWidth: 1, borderColor: theme.colors.primaryLight, padding: 10, borderRadius: 6, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', height: 44 },
  txtBtnPlaceholder: { color: theme.colors.textLight, fontSize: 14 },
  txtBtnAtivo: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  formRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 14 },
  inputGroup: { marginBottom: 4, flex: 1 },
  flex4: { flex: Platform.OS === 'web' ? 4 : undefined }, flex6: { flex: Platform.OS === 'web' ? 6 : undefined },
  input: { borderWidth: 1, borderColor: theme.colors.primaryLight, padding: 10, borderRadius: 6, backgroundColor: '#FFF', fontSize: 14, height: 44 },
  pickerContainer: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, backgroundColor: '#FFF', overflow: 'hidden', height: 44, justifyContent: 'center' },
  picker: { height: 44, width: '100%' },
  btnIncluirLinha: { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 6, borderStyle: 'dashed', marginVertical: 10, alignSelf: 'flex-start' },
  btnIncluirLinhaTexto: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 4, fontSize: 13 },
  button: { backgroundColor: theme.colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10, ...theme.shadows.m, height: 48, justifyContent: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  modalContent: { width: '90%', maxWidth: 440, backgroundColor: '#FFF', borderRadius: 8, padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  buscaInput: { padding: 10, borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, marginBottom: 12, backgroundColor: '#FFF' },
  produtoItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  produtoNome: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  produtoDetalhes: { fontSize: 13, color: theme.colors.textLight }
});