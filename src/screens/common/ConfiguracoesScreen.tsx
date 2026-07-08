// src/screens/common/ConfiguracoesScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { theme } from '../../styles/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addCliente, listarClientes, updateCliente, deleteCliente, updateSenhaOperador } from '../../services/database';
import Icon from '@expo/vector-icons/MaterialIcons';

// Tipagem das propriedades de navegação herdadas da pilha mestre
type Props = NativeStackScreenProps<RootStackParamList, 'Configuracoes'>;

// Contrato de dados para representação de usuários/operadores comerciais no front-end
interface UsuarioSistema {
  id?: number;
  nomeCompleto: string;
  email: string;
  senha?: string;
  apelido: string;
}

// Estados possíveis de exibição de painel (Máquina de Estados Visual)
type ModoTela = 'minha_conta' | 'cadastrar_usuario' | 'listar_usuarios';

/**
 * Utilitário multiplataforma para exibição de mensagens de alerta.
 * Redireciona a chamada para caixas síncronas em navegadores web.
 */
const exibirAlerta = (titulo: string, mensagem: string, botoes?: { text: string; onPress?: () => void }[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensagem}`);
    const botaoOk = botoes?.find(b => b.onPress);
    if (botaoOk && botaoOk.onPress) botaoOk.onPress();
  } else {
    Alert.alert(titulo, mensagem, botoes);
  }
};

export default function ConfiguracoesScreen({ navigation, route }: Props) {
  // --- CONTROLE DE PERMISSÕES E TRAVAS DE ACESSO ---
  const usuarioLogado = route.params?.usuarioAtual;
  
  // Avaliação booleana: Determina se o usuário logado possui privilégios de Administrador Master.
  // Trata falsos positivos avaliando e-mails conhecidos ou apelidos de fábrica.
  const isAdmin = !usuarioLogado || usuarioLogado?.email === 'admin@meatpack.com' || usuarioLogado?.email === 'admin' || usuarioLogado?.apelido === 'Admin';

  // --- ESTADOS REATIVOS VISUAIS ---
  const [modo, setModo] = useState<ModoTela>('minha_conta');
  
  // Estados para redefinição de senha do próprio perfil logado
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Estados para o formulário de cadastro de NOVOS operadores (Apenas Admin)
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenhaCad, setNovaSenhaCad] = useState('');

  // Estados para gerenciamento e listagem em lote de usuários existentes
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioSistema | null>(null); // Armazena a linha em edição
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSenha, setEditSenha] = useState('');

  /**
   * Coleta a lista de operadores corporativos cadastrados.
   * Cláusula de barreira impede que operadores comuns invoquem essa query.
   */
  const carregarUsuarios = async () => {
    if (!isAdmin) return;
    try {
      const lista = await listarClientes();
      setUsuarios(lista);
    } catch (error) {
      console.error('Falha ao ler operadores comerciais:', error);
    }
  };

  // Monitora a mudança de abas do painel: Se o Admin clicar na aba de listagem, re-carrega os dados do banco
  useEffect(() => {
    if (modo === 'listar_usuarios') carregarUsuarios();
  }, [modo]);

  /**
   * Processa a redefinição de credencial do usuário ativo.
   * Bifurca a escrita no AsyncStorage (se Admin) ou na tabela SQLite (se Operador).
   */
  const handleAlterarSenha = async () => {
    if (!novaSenha || !confirmarSenha) { exibirAlerta('Aviso', 'Preencha os campos de senha.'); return; }
    if (novaSenha !== confirmarSenha) { exibirAlerta('Erro', 'As senhas não coincidem.'); return; }
    
    try {
      if (isAdmin) {
        // Altera a chave mestra global consumida pela tela de login
        await AsyncStorage.setItem('@meatpack:admin_password', novaSenha);
        exibirAlerta('Sucesso', 'Senha Master do Administrador atualizada com sucesso!');
      } else {
        // Despacha a atualização via e-mail identificador na tabela de clientes
        await updateSenhaOperador(usuarioLogado.email, novaSenha);
        exibirAlerta('Sucesso', 'Sua senha de operador foi alterada com sucesso!');
      }
      setNovaSenha(''); setConfirmarSenha('');
    } catch (error) {
      exibirAlerta('Erro', 'Falha ao atualizar credenciais.');
    }
  };

  /**
   * Executa a criação de uma nova conta de operador no banco de dados.
   * Apenas acessível pelo Administrador do Sistema.
   */
  const handleCadastrarUsuario = async () => {
    if (!novoNome || !novoEmail || !novaSenhaCad) { exibirAlerta('Aviso', 'Preencha todos os campos.'); return; }
    try {
      await addCliente({ nomeCompleto: novoNome, email: novoEmail, senha: novaSenhaCad });
      exibirAlerta('Sucesso', `Usuário registrado com sucesso!`);
      setNovoNome(''); setNovoEmail(''); setNovaSenhaCad('');
      setModo('listar_usuarios'); // Força a visualização a retornar para a listagem atualizada
    } catch (error: any) {
      exibirAlerta('Erro de Cadastro', error.message || 'Não foi possível registrar o usuário.');
    }
  };

  /**
   * Salva as alterações de um operador específico selecionado na listagem.
   * Avalia de forma opcional se uma nova senha forçada foi inserida no input.
   */
  const handleSalvarEdicaoUsuario = async () => {
    if (!usuarioEditando || usuarioEditando.id === undefined) return;
    if (!editNome || !editEmail) { exibirAlerta('Aviso', 'Nome e E-mail são obrigatórios.'); return; }

    try {
      const dadosUpdate: any = { nomeCompleto: editNome, email: editEmail.trim() };
      // Se o campo de redefinição forçada não estiver vazio, acopla a nova senha ao payload
      if (editSenha.trim() !== '') dadosUpdate.senha = editSenha;
      
      await updateCliente(usuarioEditando.id, dadosUpdate);
      exibirAlerta('Sucesso', 'Operador atualizado!');
      setUsuarioEditando(null); // Fecha o painel/box de edição inline
      carregarUsuarios();       // Atualiza a listagem em tela
    } catch (error) {
      console.error('Falha ao editar operador:', error);
    }
  };

  /**
   * Remove permanentemente um funcionário da base relacional do sistema.
   * Exige dupla confirmação por segurança operacional.
   */
  const handleExcluirUsuario = (id: number, nome: string) => {
    exibirAlerta('Confirmar Exclusão', `Deseja deletar permanentemente o operador "${nome}"?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', onPress: async () => { await deleteCliente(id); carregarUsuarios(); } }
    ]);
  };

  return (
    <ScreenWrapper>
      {/* 'keyboardShouldPersistTaps="handled"' permite fechar o teclado ao clicar fora dos inputs */}
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          
          {/* TÍTULO DINÂMICO BASEADO NO MODO ATIVO */}
          <Text style={styles.title}>
            {modo === 'minha_conta' && 'Alterar Minha Senha'}
            {modo === 'cadastrar_usuario' && 'Cadastrar Novo Operador'}
            {modo === 'listar_usuarios' && 'Gerenciamento de Contas Corporativas'}
          </Text>
          
          {/* CONTROLADOR DE ABAS (RENDERIZADO EXCLUSIVAMENTE SE LOGADO COMO ADMIN) */}
          {isAdmin && (
            <View style={styles.tabContainer}>
              <TouchableOpacity style={[styles.tab, modo === 'minha_conta' && styles.tabAtiva]} onPress={() => { setModo('minha_conta'); setUsuarioEditando(null); }}>
                <Text style={[styles.tabTexto, modo === 'minha_conta' && styles.tabTextoAtivo]}>Minha Senha</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, modo === 'listar_usuarios' && styles.tabAtiva]} onPress={() => { setModo('listar_usuarios'); setUsuarioEditando(null); }}>
                <Text style={[styles.tabTexto, modo === 'listar_usuarios' && styles.tabTextoAtivo]}>Operadores</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, modo === 'cadastrar_usuario' && styles.tabAtiva]} onPress={() => { setModo('cadastrar_usuario'); setUsuarioEditando(null); }}>
                <Text style={[styles.tabTexto, modo === 'cadastrar_usuario' && styles.tabTextoAtivo]}>+ Criar Conta</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* BLOCK 1: FORMULÁRIO DE REDEFINIÇÃO DE SENHA PRÓPRIA */}
          {modo === 'minha_conta' && (
            <View style={styles.form}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Usuário Ativo:</Text>
                <Text style={styles.infoValue}>{isAdmin ? 'Administrador do Sistema' : usuarioLogado?.nomeCompleto}</Text>
              </View>
              <Text style={styles.label}>Nova Senha</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="Sua nova senha" value={novaSenha} onChangeText={setNovaSenha} />
              <Text style={styles.label}>Confirmar Nova Senha</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="Confirme a senha" value={confirmarSenha} onChangeText={setConfirmarSenha} />
              <TouchableOpacity style={styles.btnSalvar} onPress={handleAlterarSenha}>
                <Icon name="vpn-key" size={18} color="#FFF" />
                <Text style={styles.btnTexto}>Salvar Nova Senha</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* BLOCK 2: FORMULÁRIO DE CRIAÇÃO DE NOVOS OPERADORES (ADMIN ONLY) */}
          {modo === 'cadastrar_usuario' && (
            <View style={styles.form}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput style={styles.input} placeholder="Nome do funcionário" value={novoNome} onChangeText={setNovoNome} />
              <Text style={styles.label}>E-mail / Login de Acesso</Text>
              <TextInput style={styles.input} placeholder="exemplo@meatpack.com" keyboardType="email-address" autoCapitalize="none" value={novoEmail} onChangeText={setNovoEmail} />
              <Text style={styles.label}>Senha Inicial</Text>
              <TextInput style={styles.input} secureTextEntry placeholder="Senha provisória" value={novaSenhaCad} onChangeText={setNovaSenhaCad} />
              <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: '#2e7d32' }]} onPress={handleCadastrarUsuario}>
                <Icon name="check" size={18} color="#FFF" />
                <Text style={styles.btnTexto}>Registrar Operador</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* BLOCK 3: SUB-SISTEMA DE LISTAGEM E EDIÇÃO INLINE DE CONTAS */}
          {modo === 'listar_usuarios' && (
            <View style={styles.form}>
              {usuarioEditando ? (
                // Sub-Bloco 3.A: Painel de Edição de Linha Ativa (Inline Edit Form)
                <View style={styles.boxEdicao}>
                  <Text style={styles.subTituloEdicao}>Editando: {usuarioEditando.nomeCompleto}</Text>
                  <Text style={styles.label}>Nome</Text>
                  <TextInput style={styles.input} value={editNome} onChangeText={setEditNome} />
                  <Text style={styles.label}>E-mail</Text>
                  <TextInput style={styles.input} value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" />
                  <Text style={styles.label}>Forçar Senha (Opcional)</Text>
                  <TextInput style={styles.input} secureTextEntry placeholder="Em branco para manter" value={editSenha} onChangeText={setEditSenha} />
                  <View style={styles.rowBotoes}>
                    <TouchableOpacity style={[styles.btnSalvar, { flex: 1 }]} onPress={handleSalvarEdicaoUsuario}><Text style={styles.btnTexto}>Salvar</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnCancelarEdicao} onPress={() => setUsuarioEditando(null)}><Text style={styles.btnCancelarEdicaoTexto}>Sair</Text></TouchableOpacity>
                  </View>
                </View>
              ) : (
                // Sub-Bloco 3.B: Mapeamento de Linhas/Cards dos Operadores Corporativos
                <View>
                  {usuarios.length === 0 ? (
                    <Text style={styles.txtVazio}>Nenhum operador cadastrado.</Text>
                  ) : (
                    usuarios.map((item) => (
                      <View key={item.id} style={styles.userCard}>
                        <View style={styles.userInfos}>
                          <Text style={styles.userCardNome}>{item.nomeCompleto}</Text>
                          <Text style={styles.userCardEmail}>{item.email}</Text>
                        </View>
                        {/* Ícones de Ação (Gatilhos de Edição e Deleção) */}
                        <View style={styles.userCardAcoes}>
                          <TouchableOpacity onPress={() => { setUsuarioEditando(item); setEditNome(item.nomeCompleto); setEditEmail(item.email); setEditSenha(''); }}>
                            <Icon name="edit" size={20} color="#7A1E1E" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => item.id && handleExcluirUsuario(item.id, item.nomeCompleto)}>
                            <Icon name="delete-forever" size={20} color="#d32f2f" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* GATILHO DE RETORNO À NAVEGAÇÃO ANTERIOR */}
        <TouchableOpacity style={styles.btnVoltar} onPress={() => navigation.goBack()}>
          <Text style={styles.btnVoltarTexto}>Voltar ao Menu Principal</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================================================
// --- FOLHA DE ESTILOS DA INTERFACE (STYLESHEET) ---
// ============================================================================
const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: 'rgba(245, 245, 220, 0.9)', padding: 16, justifyContent: 'center' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 8, borderWidth: 1, borderColor: '#e3e3e3', width: '100%', maxWidth: 500, alignSelf: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#7A1E1E', textAlign: 'center', marginBottom: 15 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabAtiva: { borderBottomWidth: 3, borderBottomColor: '#7A1E1E' },
  tabTexto: { fontSize: 12, color: '#777', fontWeight: '600' },
  tabTextoAtivo: { color: '#7A1E1E', fontWeight: 'bold' },
  form: { gap: 10 },
  infoBox: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#eee' },
  infoLabel: { fontSize: 11, color: '#888', fontWeight: 'bold' },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  label: { fontSize: 13, fontWeight: '600', color: '#444' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, backgroundColor: '#fff', fontSize: 14 },
  btnSalvar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7A1E1E', padding: 12, borderRadius: 6, gap: 8 },
  btnTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  userCard: { flexDirection: 'row', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 6, marginBottom: 10, borderWidth: 1, borderColor: '#e9e9e9', alignItems: 'center', justifyContent: 'space-between' },
  userInfos: { flex: 1 }, userCardNome: { fontSize: 14, fontWeight: 'bold', color: '#333' }, userCardEmail: { fontSize: 12, color: '#666' },
  userCardAcoes: { flexDirection: 'row', gap: 14 }, boxEdicao: { backgroundColor: '#fff3f3', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ffcccc', gap: 10 },
  subTituloEdicao: { fontSize: 14, fontWeight: 'bold', color: '#7A1E1E' }, rowBotoes: { flexDirection: 'row', gap: 10 },
  btnCancelarEdicao: { justifyContent: 'center', paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  btnCancelarEdicaoTexto: { color: '#555', fontWeight: '600' }, txtVazio: { textAlign: 'center', color: '#888', fontStyle: 'italic' },
  btnVoltar: { alignSelf: 'center', marginTop: 20 }, btnVoltarTexto: { color: '#7A1E1E', fontWeight: 'bold', fontSize: 14 }
});