// src/screens/common/CadastrarProdutoScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { addProduto, getFornecedores, getProdutos } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'CadastrarProduto'>;

const exibirAlerta = (titulo: string, mensagem: string, botoes?: { text: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    const botaoOk = botoes?.find(b => b.onPress);
    if (botaoOk && botaoOk.onPress) botaoOk.onPress();
  } else {
    Alert.alert(titulo, mensagem, botoes);
  }
};

interface ItemFormProduto {
  codigo: string;
  descricao: string;
  quantidade: string;
  categoria: 'Bovina' | 'Suína' | 'Aves' | 'Outros';
  precoUnitario: string;
  fornecedor: string;
}

const CadastrarProdutoScreen: React.FC<Props> = ({ navigation }) => {
  const [produtosForm, setProdutosForm] = useState<ItemFormProduto[]>([
    { codigo: '', descricao: '', quantidade: '', categoria: 'Bovina', precoUnitario: '', fornecedor: '' }
  ]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const carregarFornecedores = async () => {
    try { const lista = await getFornecedores(); setFornecedores(lista); } catch (e) {}
  };

  useEffect(() => { carregarFornecedores(); }, []);

  const handleRowChange = (index: number, field: keyof ItemFormProduto, value: string) => {
    const novosProps = [...produtosForm];
    novosProps[index] = { ...novosProps[index], [field]: value };
    setProdutosForm(novosProps);
  };

  const handleAdicionarLinhaForm = () => {
    setProdutosForm([...produtosForm, { codigo: '', descricao: '', quantidade: '', categoria: 'Bovina', precoUnitario: '', fornecedor: '' }]);
  };

  const handleRemoverLinhaForm = (index: number) => {
    if (produtosForm.length === 1) return;
    setProdutosForm(produtosForm.filter((_, i) => i !== index));
  };

  const handleCadastrar = async () => {
    if (isLoading) return;

    for (let i = 0; i < produtosForm.length; i++) {
      const item = produtosForm[i];
      if (!item.descricao.trim() || !item.quantidade.trim() || !item.precoUnitario.trim() || !item.fornecedor.trim()) {
        exibirAlerta('Campos Obrigatórios', `Por favor, preencha todos os campos do produto na linha #${i + 1}.`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const todosProdutosExistentes = await getProdutos();
      let ultimoCodigoMax = todosProdutosExistentes.reduce((max, p) => Math.max(max, p.codigo || 0), 0);

      for (const item of produtosForm) {
        let codigoFinal = item.codigo ? parseInt(item.codigo, 10) : 0;
        if (codigoFinal === 0) {
          ultimoCodigoMax += 1;
          codigoFinal = ultimoCodigoMax;
        }

        await addProduto({
          codigo: codigoFinal,
          descricao: item.descricao.trim(),
          quantidade: parseFloat(item.quantidade),
          categoria: item.categoria,
          precoUnitario: parseFloat(item.precoUnitario),
          fornecedor: item.fornecedor.trim(),
        });
      }

      // CORRIGIDO: Redireciona de volta para a consulta de estoque ao finalizar
      exibirAlerta('Sucesso', 'Lote de produtos cadastrado com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            setProdutosForm([{ codigo: '', descricao: '', quantidade: '', categoria: 'Bovina', precoUnitario: '', fornecedor: '' }]);
            navigation.navigate('ConsultarEstoque', { infoMessage: 'Produtos adicionados com sucesso!' });
          }
        }
      ]);

    } catch (error: any) {
      exibirAlerta('Aviso do Sistema', error?.message || 'Erro ao processar lote de produtos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="always">
        <AnimatedView from="top" duration={500}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Cadastrar Produtos</Text>
            <Text style={styles.pageDescription}>Preencha os itens abaixo para dar entrada em novos lotes de mercadoria.</Text>
          </View>
        </AnimatedView>

        <AnimatedView from="bottom" delay={100} duration={600} style={{ flex: 1 }}>
          <View style={styles.formPanelContainer}>
            {produtosForm.map((item, index) => (
              <View key={index} style={styles.itemLoteCard}>
                <View style={styles.rowCardHeader}>
                  <Text style={styles.itemTitle}>Item #{index + 1}</Text>
                  {produtosForm.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoverLinhaForm(index)}>
                      <Icon name="delete" size={20} color="#d32f2f" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.inputContainer, styles.flex4]}>
                    <Text style={styles.label}>Código (Opcional)</Text>
                    <TextInput style={styles.input} placeholder="Auto" value={item.codigo} onChangeText={(t) => handleRowChange(index, 'codigo', t)} keyboardType="numeric" />
                  </View>

                  <View style={[styles.inputContainer, styles.flex6]}>
                    <Text style={styles.label}>Categoria</Text>
                    <View style={styles.pickerContainer}>
                      <Picker selectedValue={item.categoria} onValueChange={(v) => handleRowChange(index, 'categoria', v as any)} style={styles.picker}>
                        <Picker.Item label="Bovina" value="Bovina" />
                        <Picker.Item label="Suína" value="Suína" />
                        <Picker.Item label="Aves" value="Aves" />
                        <Picker.Item label="Outros" value="Outros" />
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Descrição do Produto</Text>
                  <TextInput style={styles.input} placeholder="Ex: Alcatra Bov. Resfriada" value={item.descricao} onChangeText={(t) => handleRowChange(index, 'descricao', t)} />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.inputContainer, styles.flex1]}>
                    <Text style={styles.label}>Qtd Inicial (kg)</Text>
                    <TextInput style={styles.input} placeholder="0.00" value={item.quantidade} onChangeText={(t) => handleRowChange(index, 'quantidade', t)} keyboardType="numeric" />
                  </View>
                  <View style={[styles.inputContainer, styles.flex1]}>
                    <Text style={styles.label}>Preço por kg (R$)</Text>
                    <TextInput style={styles.input} placeholder="0.00" value={item.precoUnitario} onChangeText={(t) => handleRowChange(index, 'precoUnitario', t)} keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Fornecedor</Text>
                  <TextInput style={styles.input} placeholder="Nome do Fornecedor" value={item.fornecedor} onChangeText={(t) => handleRowChange(index, 'fornecedor', t)} />
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.btnIncluirLinha} onPress={handleAdicionarLinhaForm}>
              <Icon name="add" size={20} color={theme.colors.primary} />
              <Text style={styles.btnIncluirLinhaTexto}>Incluir outro produto no lote</Text>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.cadastrarButton, isLoading && styles.disabledBtn]} onPress={handleCadastrar} disabled={isLoading}>
                <Icon name="save" size={22} color="#FFF" />
                <Text style={styles.cadastrarButtonText}>{isLoading ? 'Salvando Lote...' : 'Gravar Todos os Produtos'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('HomeScreen')}>
                <Icon name="arrow-back" size={18} color={theme.colors.primary} />
                <Text style={styles.backButtonText}>Voltar ao Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedView>
      </ScrollView>
    </ScreenWrapper>
  );
};

export default CadastrarProdutoScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)' },
  contentContainer: { padding: theme.spacing.m, paddingBottom: 60, flexGrow: 1 },
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.l, maxWidth: 700, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center', marginBottom: theme.spacing.xs },
  pageDescription: { fontSize: 14, color: theme.colors.textLight, textAlign: 'center', fontStyle: 'italic' },
  formPanelContainer: { backgroundColor: theme.colors.surface, padding: 20, borderRadius: theme.borderRadius.m, width: '100%', maxWidth: 800, alignSelf: 'center', ...theme.shadows.s, borderWidth: 1, borderColor: '#dcdcdc' },
  itemLoteCard: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e9e9e9', marginBottom: 20 },
  rowCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 6 },
  itemTitle: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  formRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16 },
  flex1: { flex: 1 }, flex4: { flex: Platform.OS === 'web' ? 4 : undefined }, flex6: { flex: Platform.OS === 'web' ? 6 : undefined },
  inputContainer: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, padding: 10, fontSize: 15, backgroundColor: '#FFF', height: 44, color: '#000' },
  pickerContainer: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, overflow: 'hidden', backgroundColor: '#FFF', height: 44, justifyContent: 'center' },
  picker: { height: 44 },
  btnIncluirLinha: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 6, borderStyle: 'dashed', marginBottom: 25, alignSelf: 'flex-start' },
  btnIncluirLinhaTexto: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  actionRow: { flexDirection: Platform.OS === 'web' ? 'row-reverse' : 'column', justifyContent: 'space-between', alignItems: 'center', gap: 12, width: '100%' },
  cadastrarButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B0000', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, width: Platform.OS === 'web' ? 'auto' : '100%', height: 50 },
  cadastrarButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 6 },
  backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, width: Platform.OS === 'web' ? 'auto' : '100%' },
  backButtonText: { color: '#8B0000', fontWeight: '600', marginLeft: 4 },
  disabledBtn: { opacity: 0.6 }
});