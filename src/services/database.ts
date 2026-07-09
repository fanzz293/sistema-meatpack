// src/services/database.ts
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================================================
// --- CONTRATOS DE TIPAGEM (INTERFACES) ---
// ============================================================================

export interface Produto {
  codigo: number;
  descricao: string;
  quantidade: number;
  categoria: 'Bovina' | 'Suína' | 'Aves' | 'Outros' | string;
  precoUnitario: number;
  fornecedor?: string;
}

export interface HistoricoMovimento {
  id: number;
  produtoCodigo: number;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  data: string;
  motivo: string;
  pedidoId?: number;
}

export interface ItemPedido {
  produtoCodigo: number;
  quantidade: number;
  precoUnitario: number;
}

export interface Pedido {
  id: number;
  data: string;
  itens: ItemPedido[];
  status: 'aguardando' | 'entregue';
  fornecedor: string;
  notaFiscalRecebida: boolean;
  horaEntrega?: string;
}

export interface Cliente {
  id?: number;
  nomeCompleto: string;
  email: string;
  senha?: string;
  apelido?: string;
  aceitaTermos?: boolean;
}

// ============================================================================
// --- INICIALIZAÇÃO DO BANCO DE DADOS ---
// ============================================================================

/**
 * Cria as tabelas relacionais caso elas não existam no SQLite nativo.
 * No ambiente Web, o AsyncStorage não requer inicialização estrutural prévia.
 */
export const initDB = async (): Promise<void> => {
  if (Platform.OS === 'web') return;

  try {
    const db = await SQLite.openDatabaseSync('meatpack.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nomeCompleto TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        apelido TEXT,
        aceitaTermos INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS produtos (
        codigo INTEGER PRIMARY KEY,
        descricao TEXT NOT NULL,
        quantidade REAL NOT NULL,
        categoria TEXT NOT NULL,
        precoUnitario REAL NOT NULL,
        fornecedor TEXT
      );

      CREATE TABLE IF NOT EXISTS historico_movimentacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produtoCodigo INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        quantidade REAL NOT NULL,
        data TEXT NOT NULL,
        motivo TEXT,
        pedidoId INTEGER,
        FOREIGN KEY (produtoCodigo) REFERENCES produtos (codigo)
      );

      CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        itens TEXT NOT NULL,
        status TEXT NOT NULL,
        fornecedor TEXT NOT NULL,
        notaFiscalRecebida INTEGER DEFAULT 0,
        horaEntrega TEXT
      );
    `);
    console.log('Banco de dados SQLite inicializado com sucesso.');
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
  }
};

// ============================================================================
// --- MÓDULO: GERENCIAMENTO DE OPERADORES (CLIENTES/USUÁRIOS) ---
// ============================================================================

export const addCliente = async (cliente: Cliente): Promise<void> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:clientes');
    const clientes: Cliente[] = raw ? JSON.parse(raw) : [];
    const novo = { ...cliente, id: Date.now(), aceitaTermos: cliente.aceitaTermos ?? true };
    clientes.push(novo);
    await AsyncStorage.setItem('@meatpack_web:clientes', JSON.stringify(clientes));
    return;
  }

  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.runAsync(
    'INSERT INTO clientes (nomeCompleto, email, senha, apelido, aceitaTermos) VALUES (?, ?, ?, ?, ?)',
    [cliente.nomeCompleto, cliente.email, cliente.senha || '', cliente.apelido || '', cliente.aceitaTermos ? 1 : 0]
  );
};

export const listarClientes = async (): Promise<Cliente[]> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:clientes');
    return raw ? JSON.parse(raw) : [];
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  return await db.getAllAsync<Cliente>('SELECT * FROM clientes ORDER BY nomeCompleto ASC');
};

export const updateCliente = async (id: number, dados: Partial<Cliente>): Promise<void> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:clientes');
    let clientes: Cliente[] = raw ? JSON.parse(raw) : [];
    clientes = clientes.map(c => c.id === id ? { ...c, ...dados } : c);
    await AsyncStorage.setItem('@meatpack_web:clientes', JSON.stringify(clientes));
    return;
  }

  const db = SQLite.openDatabaseSync('meatpack.db');
  if (dados.senha) {
    await db.runAsync('UPDATE clientes SET nomeCompleto = ?, email = ?, senha = ? WHERE id = ?', 
      [dados.nomeCompleto || '', dados.email || '', dados.senha, id]);
  } else {
    await db.runAsync('UPDATE clientes SET nomeCompleto = ?, email = ? WHERE id = ?', 
      [dados.nomeCompleto || '', dados.email || '', id]);
  }
};

export const deleteCliente = async (id: number): Promise<void> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:clientes');
    let clientes: Cliente[] = raw ? JSON.parse(raw) : [];
    clientes = clientes.filter(c => c.id !== id);
    await AsyncStorage.setItem('@meatpack_web:clientes', JSON.stringify(clientes));
    return;
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.runAsync('DELETE FROM clientes WHERE id = ?', [id]);
};

export const updateSenhaOperador = async (email: string, novaSenha: string): Promise<void> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:clientes');
    let clientes: Cliente[] = raw ? JSON.parse(raw) : [];
    clientes = clientes.map(c => c.email === email ? { ...c, senha: novaSenha } : c);
    await AsyncStorage.setItem('@meatpack_web:clientes', JSON.stringify(clientes));
    return;
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.runAsync('UPDATE clientes SET senha = ? WHERE email = ?', [novaSenha, email]);
};

// ============================================================================
// --- MÓDULO: GERENCIAMENTO DE PRODUTOS E ESTOQUE ---
// ============================================================================

export const addProduto = async (produto: Produto): Promise<void> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:produtos');
    const produtos: Produto[] = raw ? JSON.parse(raw) : [];
    produtos.push(produto);
    await AsyncStorage.setItem('@meatpack_web:produtos', JSON.stringify(produtos));
    return;
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.runAsync(
    'INSERT INTO produtos (codigo, descricao, quantidade, categoria, precoUnitario, fornecedor) VALUES (?, ?, ?, ?, ?, ?)',
    [produto.codigo, produto.descricao, produto.quantidade, produto.categoria, produto.precoUnitario, produto.fornecedor || '']
  );
};

export const getProdutos = async (): Promise<Produto[]> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:produtos');
    return raw ? JSON.parse(raw) : [];
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  return await db.getAllAsync<Produto>('SELECT * FROM produtos ORDER BY descricao ASC');
};

export const searchProdutos = async (query: string): Promise<Produto[]> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:produtos');
    const produtos: Produto[] = raw ? JSON.parse(raw) : [];
    const term = query.toLowerCase();
    return produtos.filter(p => 
      p.descricao.toLowerCase().includes(term) || 
      p.codigo.toString().includes(term)
    );
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  const param = `%${query}%`;
  return await db.getAllAsync<Produto>(
    'SELECT * FROM produtos WHERE descricao LIKE ? OR CAST(codigo AS TEXT) LIKE ? ORDER BY descricao ASC',
    [param, param]
  );
};

export const updateProduto = async (produto: Produto, codigoOriginal: number): Promise<void> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:produtos');
    let produtos: Produto[] = raw ? JSON.parse(raw) : [];
    produtos = produtos.map(p => p.codigo === codigoOriginal ? produto : p);
    await AsyncStorage.setItem('@meatpack_web:produtos', JSON.stringify(produtos));
    return;
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.runAsync(
    'UPDATE produtos SET codigo = ?, descricao = ?, quantidade = ?, categoria = ?, precoUnitario = ?, fornecedor = ? WHERE codigo = ?',
    [produto.codigo, produto.descricao, produto.quantidade, produto.categoria, produto.precoUnitario, produto.fornecedor || '', codigoOriginal]
  );
};

export const deleteProduto = async (codigo: number): Promise<void> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:produtos');
    let produtos: Produto[] = raw ? JSON.parse(raw) : [];
    produtos = produtos.filter(p => p.codigo !== codigo);
    await AsyncStorage.setItem('@meatpack_web:produtos', JSON.stringify(produtos));
    
    // Deleta os históricos vinculados
    const histRaw = await AsyncStorage.getItem('@meatpack_web:historico');
    let historico: HistoricoMovimento[] = histRaw ? JSON.parse(histRaw) : [];
    historico = historico.filter(h => h.produtoCodigo !== codigo);
    await AsyncStorage.setItem('@meatpack_web:historico', JSON.stringify(historico));
    return;
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM historico_movimentacoes WHERE produtoCodigo = ?', [codigo]);
    await db.runAsync('DELETE FROM produtos WHERE codigo = ?', [codigo]);
  });
};

/**
 * Coleta e unifica a lista de fornecedores homologados no sistema.
 * TIPAGEM CORRIGIDA para sanar o erro TS7006 (implicit any).
 */
export const getFornecedores = async (): Promise<string[]> => {
  if (Platform.OS === 'web') {
    try {
      const produtosRaw = await AsyncStorage.getItem('@meatpack_web:produtos');
      const result: Produto[] = produtosRaw ? JSON.parse(produtosRaw) : [];
      
      // Aplicando as tipagens explícitas nas funções de callback
      const listaLimpa = result
        .map((r: Produto) => r.fornecedor ? r.fornecedor.trim() : '')
        .filter((f: string) => f !== '');
        
      return Array.from(new Set(listaLimpa)).sort();
    } catch (e) {
      return [];
    }
  }

  try {
    const db = SQLite.openDatabaseSync('meatpack.db');
    // Coleta diretamente dos produtos na base de dados
    const result: any[] = await db.getAllAsync('SELECT DISTINCT fornecedor FROM produtos WHERE fornecedor IS NOT NULL AND fornecedor != ""');
    
    // Tratando o mapeamento nativo com tipagens estritas
    const listaLimpa = result.map((r: any) => String(r.fornecedor).trim());
    return Array.from(new Set(listaLimpa)).sort();
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    return [];
  }
};

// ============================================================================
// --- MÓDULO: KARDEX E AUDITORIA (REGISTRO DE MOVIMENTAÇÕES) ---
// ============================================================================

export const registrarSaidaProduto = async (codigo: number, quantidadeBaixa: number, motivo: string): Promise<void> => {
  const dataAtual = new Date().toISOString();

  if (Platform.OS === 'web') {
    const produtosRaw = await AsyncStorage.getItem('@meatpack_web:produtos');
    let produtos: Produto[] = produtosRaw ? JSON.parse(produtosRaw) : [];
    
    // Abate do inventário
    produtos = produtos.map(p => {
      if (p.codigo === codigo) {
        return { ...p, quantidade: Math.max(0, p.quantidade - quantidadeBaixa) };
      }
      return p;
    });
    await AsyncStorage.setItem('@meatpack_web:produtos', JSON.stringify(produtos));

    // Registro na linha do tempo
    const historicoRaw = await AsyncStorage.getItem('@meatpack_web:historico');
    const historico: HistoricoMovimento[] = historicoRaw ? JSON.parse(historicoRaw) : [];
    historico.push({
      id: Date.now(),
      produtoCodigo: codigo,
      tipo: 'saida',
      quantidade: quantidadeBaixa,
      data: dataAtual,
      motivo
    });
    await AsyncStorage.setItem('@meatpack_web:historico', JSON.stringify(historico));
    return;
  }

  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE produtos SET quantidade = MAX(0, quantidade - ?) WHERE codigo = ?', [quantidadeBaixa, codigo]);
    await db.runAsync('INSERT INTO historico_movimentacoes (produtoCodigo, tipo, quantidade, data, motivo) VALUES (?, "saida", ?, ?, ?)', [codigo, quantidadeBaixa, dataAtual, motivo]);
  });
};

export const getHistoricoProduto = async (codigo: number): Promise<HistoricoMovimento[]> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:historico');
    const historico: HistoricoMovimento[] = raw ? JSON.parse(raw) : [];
    return historico
      .filter(h => h.produtoCodigo === codigo)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  return await db.getAllAsync<HistoricoMovimento>(
    'SELECT * FROM historico_movimentacoes WHERE produtoCodigo = ? ORDER BY data DESC',
    [codigo]
  );
};

// ============================================================================
// --- MÓDULO: LOGÍSTICA E ORDENS DE COMPRA (PEDIDOS) ---
// ============================================================================

export const adicionarPedido = async (pedido: Omit<Pedido, 'id'>): Promise<void> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:pedidos');
    const pedidos: Pedido[] = raw ? JSON.parse(raw) : [];
    const novo: Pedido = { ...pedido, id: Date.now() };
    pedidos.push(novo);
    await AsyncStorage.setItem('@meatpack_web:pedidos', JSON.stringify(pedidos));
    return;
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.runAsync(
    'INSERT INTO pedidos (data, itens, status, fornecedor, notaFiscalRecebida) VALUES (?, ?, ?, ?, ?)',
    [pedido.data, JSON.stringify(pedido.itens), pedido.status, pedido.fornecedor, pedido.notaFiscalRecebida ? 1 : 0]
  );
};

export const listarPedidos = async (): Promise<Pedido[]> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:pedidos');
    return raw ? JSON.parse(raw) : [];
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  const rows: any[] = await db.getAllAsync('SELECT * FROM pedidos ORDER BY id DESC');
  
  // Tratamento nativo para desserializar os arrays de itens
  return rows.map(r => ({
    ...r,
    itens: JSON.parse(r.itens),
    notaFiscalRecebida: Boolean(r.notaFiscalRecebida)
  }));
};

/**
 * Atualiza o status logístico do lote de compra.
 * Se marcado como 'entregue', processa automaticamente a entrada dos itens no estoque e gera o histórico.
 */
export const atualizarStatusPedido = async (id: number, status: 'aguardando' | 'entregue'): Promise<void> => {
  const dataFechamento = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:pedidos');
    let pedidos: Pedido[] = raw ? JSON.parse(raw) : [];
    const pedidoAlvo = pedidos.find(p => p.id === id);

    if (pedidoAlvo && status === 'entregue' && pedidoAlvo.status !== 'entregue') {
      const produtosRaw = await AsyncStorage.getItem('@meatpack_web:produtos');
      let produtos: Produto[] = produtosRaw ? JSON.parse(produtosRaw) : [];
      
      const histRaw = await AsyncStorage.getItem('@meatpack_web:historico');
      const historico: HistoricoMovimento[] = histRaw ? JSON.parse(histRaw) : [];

      pedidoAlvo.itens.forEach(item => {
        // Atualiza Inventário
        const prodIndex = produtos.findIndex(p => p.codigo === item.produtoCodigo);
        if (prodIndex >= 0) produtos[prodIndex].quantidade += item.quantidade;
        
        // Gera Auditoria de Entrada
        historico.push({
          id: Date.now() + Math.random(),
          produtoCodigo: item.produtoCodigo,
          tipo: 'entrada',
          quantidade: item.quantidade,
          data: new Date().toISOString(),
          motivo: 'Recebimento de Pedido',
          pedidoId: id
        });
      });

      await AsyncStorage.setItem('@meatpack_web:produtos', JSON.stringify(produtos));
      await AsyncStorage.setItem('@meatpack_web:historico', JSON.stringify(historico));
    }

    pedidos = pedidos.map(p => p.id === id ? { ...p, status, horaEntrega: status === 'entregue' ? dataFechamento : p.horaEntrega } : p);
    await AsyncStorage.setItem('@meatpack_web:pedidos', JSON.stringify(pedidos));
    return;
  }

  // Operação Transacional no SQLite (Rollback automático em caso de falha)
  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.withTransactionAsync(async () => {
    if (status === 'entregue') {
      const row: any = await db.getFirstAsync('SELECT * FROM pedidos WHERE id = ?', [id]);
      if (row && row.status !== 'entregue') {
        const itens: ItemPedido[] = JSON.parse(row.itens);
        const dataHist = new Date().toISOString();

        for (const item of itens) {
          await db.runAsync('UPDATE produtos SET quantidade = quantidade + ? WHERE codigo = ?', [item.quantidade, item.produtoCodigo]);
          await db.runAsync(
            'INSERT INTO historico_movimentacoes (produtoCodigo, tipo, quantidade, data, motivo, pedidoId) VALUES (?, "entrada", ?, ?, ?, ?)',
            [item.produtoCodigo, item.quantidade, dataHist, 'Recebimento de Pedido', id]
          );
        }
      }
    }
    await db.runAsync('UPDATE pedidos SET status = ?, horaEntrega = ? WHERE id = ?', [status, dataFechamento, id]);
  });
};

export const atualizarNotaFiscalPedido = async (id: number, notaFiscalRecebida: boolean): Promise<void> => {
  if (Platform.OS === 'web') {
    const raw = await AsyncStorage.getItem('@meatpack_web:pedidos');
    let pedidos: Pedido[] = raw ? JSON.parse(raw) : [];
    pedidos = pedidos.map(p => p.id === id ? { ...p, notaFiscalRecebida } : p);
    await AsyncStorage.setItem('@meatpack_web:pedidos', JSON.stringify(pedidos));
    return;
  }
  const db = SQLite.openDatabaseSync('meatpack.db');
  await db.runAsync('UPDATE pedidos SET notaFiscalRecebida = ? WHERE id = ?', [notaFiscalRecebida ? 1 : 0, id]);
};