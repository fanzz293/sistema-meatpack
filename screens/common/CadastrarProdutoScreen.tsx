// src/screens/common/CadastrarProdutoScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { addProduto, getFornecedores, getProdutos } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import ScreenWrapper from '../../components/ScreenWrapper';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'CadastrarProduto'>;

const CadastrarProdutoScreen: React.FC<Props> = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    quantidade: '',
    categoria: 'Bovina' as const,
    precoUnitario: '',
    fornecedor: '',
  });
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const carregarFornecedores = async () => {
    const lista = await getFornecedores();
    setFornecedores(lista);
  };

  useEffect(() => { 
    carregarFornecedores(); 
  }, []);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCadastrar = async () => {
    if (!formData.descricao || !formData.quantidade || !formData.precoUnitario || !formData.fornecedor) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      let codigo = formData.codigo ? parseInt(formData.codigo) : 0;
      if (codigo === 0) {
        const produtos = await getProdutos();
        codigo = produtos.reduce((max, p) => Math.max(max, p.codigo), 0) + 1;
      }

      await addProduto({
        codigo,
        descricao: formData.descricao.trim(),
        quantidade: parseFloat(formData.quantidade),
        categoria: formData.categoria,
        precoUnitario: parseFloat(formData.precoUnitario),
        fornecedor: formData.fornecedor.trim(),
      });

      // Redireciona instantaneamente injetando o parâmetro da mensagem de 4 segundos
      navigation.navigate('ConsultarEstoque', { infoMessage: 'Produto cadastrado com sucesso!' });

      setFormData({ codigo: '', descricao: '', quantidade: '', categoria: 'Bovina', precoUnitario: '', fornecedor: '' });
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao salvar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <AnimatedView from="top">
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Cadastrar Produto</Text>
            <Text style={styles.pageDescription}>
              Insira novas mercadorias e lotes de carnes no sistema. Certifique-se de vincular o fornecedor correto para manter a rastreabilidade dos pedidos.
            </Text>
          </View>
        </AnimatedView>

        <AnimatedView from="bottom" delay={150}>
          <View style={styles.formPanelContainer}>
            <View style={styles.formRow}>
              <View style={[styles.inputContainer, styles.flex4]}>
                <Text style={styles.label}>Código (opcional)</Text>
                <TextInput style={styles.input} placeholder="Automático" value={formData.codigo} onChangeText={(t) => handleChange('codigo', t)} keyboardType="numeric" />
              </View>

              <View style={[styles.inputContainer, styles.flex6]}>
                <Text style={styles.label}>Categoria</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={formData.categoria} onValueChange={(v) => handleChange('categoria', v as string)} style={styles.picker}>
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
              <TextInput style={styles.input} placeholder="Ex: Alcatra Bov. Resfriada" value={formData.descricao} onChangeText={(t) => handleChange('descricao', t)} />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputContainer, styles.flex1]}>
                <Text style={styles.label}>Quantidade Inicial (kg)</Text>
                <TextInput style={styles.input} placeholder="0.00" value={formData.quantidade} onChangeText={(t) => handleChange('quantidade', t)} keyboardType="numeric" />
              </View>
              <View style={[styles.inputContainer, styles.flex1]}>
                <Text style={styles.label}>Preço por kg (R$)</Text>
                <TextInput style={styles.input} placeholder="0.00" value={formData.precoUnitario} onChangeText={(t) => handleChange('precoUnitario', t)} keyboardType="numeric" />
              </View>
            </View>

            <View style={[styles.inputContainer, { zIndex: 9999 }]}>
              <Text style={styles.label}>Fornecedor</Text>
              <View style={styles.fornecedorWrapper}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Digite ou selecione o fornecedor" 
                  value={formData.fornecedor} 
                  onChangeText={(t) => { handleChange('fornecedor', t); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                />
                {showSuggestions && fornecedores.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView style={styles.suggestions} nestedScrollEnabled={true} keyboardShouldPersistTaps="always">
                      {fornecedores
                        .filter(f => f.toLowerCase().includes(formData.fornecedor.toLowerCase()))
                        .map((f, i) => (
                          <TouchableOpacity key={i} onPress={() => { setFormData(prev => ({ ...prev, fornecedor: f })); setShowSuggestions(false); }} style={styles.suggestionItemContainer}>
                            <Text style={styles.suggestionItem}>{f}</Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.cadastrarButton, isLoading && styles.disabledBtn]} onPress={handleCadastrar} disabled={isLoading}>
                <Icon name="add-circle" size={22} color="#FFF" />
                <Text style={styles.cadastrarButtonText}>{isLoading ? 'Salvando...' : 'Cadastrar Produto'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('HomeScreen' as any)}>
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
  contentContainer: { padding: theme.spacing.m, paddingBottom: 60 },
  headerContainer: { alignItems: 'center', marginBottom: theme.spacing.l, maxWidth: 700, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.primary, textAlign: 'center', marginBottom: theme.spacing.xs },
  pageDescription: { fontSize: 14, color: theme.colors.textLight, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
  formPanelContainer: { backgroundColor: theme.colors.surface, padding: 24, borderRadius: theme.borderRadius.m, width: '100%', maxWidth: 800, alignSelf: 'center', ...theme.shadows.s, borderWidth: 1, borderColor: '#dcdcdc' },
  formRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 16 },
  flex1: { flex: 1 }, 
  flex4: { flex: Platform.OS === 'web' ? 4 : undefined }, 
  flex6: { flex: Platform.OS === 'web' ? 6 : undefined },
  inputContainer: { marginBottom: 16, position: 'relative' },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, padding: 12, fontSize: 15, backgroundColor: '#FFF', height: 48 },
  pickerContainer: { borderWidth: 1, borderColor: theme.colors.primaryLight, borderRadius: 6, overflow: 'hidden', backgroundColor: '#FFF', height: 48, justifyContent: 'center' },
  picker: { height: 48 },
  fornecedorWrapper: { position: 'relative' },
  suggestionsContainer: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#bbb', borderRadius: 6, maxHeight: 130, zIndex: 99999, marginTop: 4, ...theme.shadows.m },
  suggestions: { maxHeight: 130 },
  suggestionItemContainer: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  suggestionItem: { fontSize: 14, color: '#000' },
  actionRow: { flexDirection: Platform.OS === 'web' ? 'row-reverse' : 'column', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, gap: 12 },
  cadastrarButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, ...theme.shadows.s, width: Platform.OS === 'web' ? 'auto' : '100%' },
  cadastrarButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 6 },
  backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, width: Platform.OS === 'web' ? 'auto' : '100%' },
  backButtonText: { color: theme.colors.primary, fontWeight: '600', marginLeft: 4 },
  disabledBtn: { opacity: 0.6 }
});