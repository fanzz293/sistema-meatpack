// src/screens/common/CadastrarProdutoScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { addProduto, getFornecedores, getProdutos } from '../../services/database';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import AnimatedView from '../../components/AnimatedView';
import Icon from '@expo/vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'CadastrarProduto'>;

export default function CadastrarProdutoScreen({ navigation }: Props) {
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
  const [showFornecedorSuggestions, setShowFornecedorSuggestions] = useState(false);
  const [fornecedorInputFocused, setFornecedorInputFocused] = useState(false);

  useEffect(() => {
    const carregarFornecedores = async () => {
      const fornecedoresLista = await getFornecedores();
      setFornecedores(fornecedoresLista);
    };
    carregarFornecedores();
  }, []);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selecionarFornecedor = (fornecedorSelecionado: string) => {
    setFormData(prev => ({ ...prev, fornecedor: fornecedorSelecionado }));
    setShowFornecedorSuggestions(false);
  };

  const handleCadastrar = async () => {
    if (!formData.descricao || !formData.quantidade || !formData.precoUnitario || !formData.fornecedor) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Gerar código automático se não foi informado
      let codigo = formData.codigo ? parseInt(formData.codigo) : 0;
      if (codigo === 0) {
        // Buscar o maior código existente e incrementar
        const produtos = await getProdutos();
        const maxCodigo = produtos.reduce((max, p) => Math.max(max, p.codigo), 0);
        codigo = maxCodigo + 1;
      }

      const produto = {
        codigo: codigo,
        descricao: formData.descricao,
        quantidade: parseFloat(formData.quantidade),
        categoria: formData.categoria,
        precoUnitario: parseFloat(formData.precoUnitario),
        fornecedor: formData.fornecedor,
      };

      await addProduto(produto);
      Alert.alert('Sucesso', `Produto cadastrado com sucesso! Código: ${codigo}`);
      setFormData({
        codigo: '',
        descricao: '',
        quantidade: '',
        categoria: 'Bovina',
        precoUnitario: '',
        fornecedor: '',
      });
    } catch (error: any) {
      console.error('Erro ao cadastrar produto:', error);
      Alert.alert('Erro', error.message || 'Não foi possível cadastrar o produto.');
    } finally {
      setIsLoading(false);
    }
  };

  const formFields = [
    { field: 'codigo', label: 'Código (opcional)', placeholder: 'Deixe em branco para gerar automaticamente', keyboardType: 'numeric' as const },
    { field: 'descricao', label: 'Descrição', placeholder: 'Nome do produto' },
    { field: 'quantidade', label: 'Quantidade (kg)', placeholder: 'Quantidade em estoque', keyboardType: 'numeric' as const },
    { field: 'precoUnitario', label: 'Preço Unitário (R$)', placeholder: 'Preço por kg', keyboardType: 'numeric' as const },
  ];

  return (
    <ImageBackground 
      source={require('../../../assets/wood-background.jpg')}
      style={styles.background}
      blurRadius={1}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <AnimatedView from="top">
          <Text style={styles.title}>Cadastrar Produto</Text>
        </AnimatedView>

        <AnimatedView from="bottom" delay={200}>
          <View style={styles.formContainer}>
            {formFields.map((item, index) => (
              <View key={item.field} style={styles.inputContainer}>
                <Text style={styles.label}>{item.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={item.placeholder}
                  placeholderTextColor={theme.colors.textLight}
                  value={formData[item.field as keyof typeof formData]}
                  onChangeText={(text) => handleChange(item.field as keyof typeof formData, text)}
                  keyboardType={item.keyboardType}
                />
              </View>
            ))}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.categoria}
                  onValueChange={(value) => handleChange('categoria', value as string)}
                  style={styles.picker}
                >
                  <Picker.Item label="Bovina" value="Bovina" />
                  <Picker.Item label="Suína" value="Suína" />
                  <Picker.Item label="Aves" value="Aves" />
                  <Picker.Item label="Outros" value="Outros" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Fornecedor</Text>
              <View style={styles.pickerContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Digite o nome do fornecedor"
                  placeholderTextColor={theme.colors.textLight}
                  value={formData.fornecedor}
                  onChangeText={(text) => handleChange('fornecedor', text)}
                  onFocus={() => {
                    setShowFornecedorSuggestions(true);
                    setFornecedorInputFocused(true);
                  }}
                  onBlur={() => {
                    setFornecedorInputFocused(false);
                    setTimeout(() => setShowFornecedorSuggestions(false), 300);
                  }}
                />
                {showFornecedorSuggestions && fornecedorInputFocused && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView style={styles.suggestions}>
                      {fornecedores
                        .filter(f => f.toLowerCase().includes(formData.fornecedor.toLowerCase()))
                        .map((f, index) => (
                          <TouchableOpacity 
                            key={index} 
                            onPress={() => selecionarFornecedor(f)}
                            style={styles.suggestionItemContainer}
                          >
                            <Text style={styles.suggestionItem}>{f}</Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.cadastrarButton, isLoading && styles.cadastrarButtonDisabled]}
              onPress={handleCadastrar}
              disabled={isLoading}
            >
              <Icon name="add-circle" size={24} color="#FFF" />
              <Text style={styles.cadastrarButtonText}>
                {isLoading ? 'Cadastrando...' : 'Cadastrar Produto'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.navigate('HomeScreen')}
            >
              <Icon name="arrow-back" size={20} color={theme.colors.primary} />
              <Text style={styles.backButtonText}>Voltar ao Início</Text>
            </TouchableOpacity>
          </View>
        </AnimatedView>
      </ScrollView>
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
  },
  contentContainer: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    textShadowColor: 'rgba(255, 255, 255, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    ...theme.shadows.l,
  },
  inputContainer: {
    marginBottom: theme.spacing.m,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  input: {
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
    color: theme.colors.text,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  picker: {
    height: 50,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.borderRadius.m,
    maxHeight: 150,
    ...theme.shadows.m,
  },
  suggestions: {
    maxHeight: 150,
  },
  suggestionItemContainer: {
    padding: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionItem: {
    fontSize: 16,
    color: theme.colors.text,
  },
  cadastrarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.l,
    borderRadius: theme.borderRadius.m,
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.m,
    ...theme.shadows.m,
  },
  cadastrarButtonDisabled: {
    opacity: 0.7,
  },
  cadastrarButtonText: {
    color: theme.colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.m,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.s,
  },
});