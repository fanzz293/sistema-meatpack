// src/services/database.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

export interface Cliente {
  id?: number;
  apelido: string;
  senha?: string;
  nomeCompleto: string;
  endereco: string;
  numero: string;
  bairro: string;
  municipio: string;
  cpf: string;
  email: string;
  telefone: string;
}

export interface Produto {
  codigo: number;
  descricao: string;
  quantidade: number;
  categoria: string;
  precoUnitario: number;
  fornecedor: string;
  ultimaEntrega?: string;
}

export interface Pedido {
  id: number;
  data: string;
  horaEntrega?: string;
  status: 'aguardando' | 'entregue';
  fornecedor: string;
  notaFiscalRecebida: boolean;
  itens: {
    produtoCodigo: number;
    quantidade: number;
    precoUnitario?: number;
  }[];
}

const ASYNC_PRODUCTS_KEY = '@meatpack_products';
const ASYNC_PEDIDOS_KEY = '@meatpack_pedidos';
const ASYNC_CLIENTES_KEY = '@meatpack_clientes';

// Inicialização Limpa e Síncrona do Banco (Nova API SDK 51+)
let db: SQLite.SQLiteDatabase | null = null;
if (Platform.OS !== 'web') {
  try {
    db = SQLite.openDatabaseSync('meatpack.db');
  } catch (error) {
    console.error('Erro ao abrir o banco de dados:', error);
  }
}

export const initDB = () => {
  if (!db) return;
  // A função execSync permite criar todas as tabelas em lote com alto desempenho
  db.execSync(
    `CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      apelido TEXT NOT NULL,
      senha TEXT NOT NULL,
      nomeCompleto TEXT NOT NULL,
      endereco TEXT,
      numero TEXT,
      bairro TEXT,
      municipio TEXT,
      cpf TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      telefone TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      codigo INTEGER PRIMARY KEY NOT NULL,
      descricao TEXT NOT NULL,
      quantidade REAL NOT NULL,
      categoria TEXT NOT NULL,
      precoUnitario REAL NOT NULL,
      fornecedor TEXT NOT NULL,
      ultimaEntrega TEXT
    );
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      horaEntrega TEXT,
      status TEXT NOT NULL,
      fornecedor TEXT NOT NULL,
      notaFiscalRecebida INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS itens_pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      produto_codigo INTEGER NOT NULL,
      quantidade REAL NOT NULL,
      precoUnitario REAL,
      FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
      FOREIGN KEY (produto_codigo) REFERENCES products (codigo)
    );
    CREATE TABLE IF NOT EXISTS historico_movimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_codigo INTEGER NOT NULL,
      data TEXT NOT NULL,
      tipo TEXT NOT NULL,
      quantidade REAL NOT NULL,
      motivo TEXT,
      pedido_id INTEGER,
      FOREIGN KEY (produto_codigo) REFERENCES products (codigo)
    );`
  );
};

export async function getProdutos(): Promise<Produto[]> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  return await db.getAllAsync<Produto>('SELECT * FROM products');
}

export async function searchProdutos(query: string): Promise<Produto[]> {
  const all = await getProdutos();
  const lower = query.toLowerCase();
  return all.filter(p => 
    p.descricao.toLowerCase().includes(lower) || 
    p.codigo.toString().includes(lower)
  );
}

export async function addProduto(produto: Produto): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    const produtos: Produto[] = raw ? JSON.parse(raw) : [];
    if (produtos.find(p => p.codigo === produto.codigo)) {
      throw new Error('Produto já cadastrado com este código.');
    }
    produtos.push(produto);
    await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));
    return;
  }
  
  await db.runAsync(
    `INSERT INTO products (codigo, descricao, quantidade, categoria, precoUnitario, fornecedor) VALUES (?, ?, ?, ?, ?, ?)`,
    [produto.codigo, produto.descricao, produto.quantidade, produto.categoria, produto.precoUnitario, produto.fornecedor.trim()]
  );
}

export async function updateProduto(produto: Produto, codigoAntigo?: number): Promise<void> {
  const idBusca = codigoAntigo !== undefined ? codigoAntigo : produto.codigo;

  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    let produtos: Produto[] = raw ? JSON.parse(raw) : [];
    const index = produtos.findIndex(p => p.codigo === idBusca);
    if (index === -1) throw new Error('Produto não encontrado');
    
    if (produto.codigo !== idBusca && produtos.find(p => p.codigo === produto.codigo)) {
      throw new Error('Já existe um produto com o novo código solicitado.');
    }
    
    produtos[index] = produto;
    await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));
    return;
  }

  await db.runAsync(
    `UPDATE products SET codigo = ?, descricao = ?, quantidade = ?, categoria = ?, precoUnitario = ?, fornecedor = ?, ultimaEntrega = ? WHERE codigo = ?`,
    [produto.codigo, produto.descricao, produto.quantidade, produto.categoria, produto.precoUnitario, produto.fornecedor, produto.ultimaEntrega || null, idBusca]
  );
}

export async function deleteProduto(codigo: number): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    let produtos: Produto[] = raw ? JSON.parse(raw) : [];
    produtos = produtos.filter(p => p.codigo !== codigo);
    await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));
    return;
  }
  
  await db.runAsync('DELETE FROM products WHERE codigo = ?', [codigo]);
}

export async function registrarSaidaProduto(codigo: number, quantidadeSaida: number, motivo: string): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    let produtos: Produto[] = raw ? JSON.parse(raw) : [];
    const index = produtos.findIndex(p => p.codigo === codigo);
    if (index !== -1) {
      produtos[index].quantidade = Math.max(0, produtos[index].quantidade - quantidadeSaida);
      await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));
    }
    return;
  }
  
  await db.runAsync(`UPDATE products SET quantidade = quantidade - ? WHERE codigo = ?`, [quantidadeSaida, codigo]);
  await db.runAsync(`INSERT INTO historico_movimentos (produto_codigo, data, tipo, quantidade, motivo) VALUES (?, date('now'), 'saida', ?, ?)`, [codigo, quantidadeSaida, motivo]);
}

export async function getFornecedores(): Promise<string[]> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
    const produtos: Produto[] = raw ? JSON.parse(raw) : [];
    return Array.from(new Set(produtos.map(p => p.fornecedor.trim())));
  }
  
  const result = await db.getAllAsync<{fornecedor: string}>('SELECT DISTINCT TRIM(fornecedor) as fornecedor FROM products');
  return result.map(r => r.fornecedor);
}

export async function adicionarPedido(pedido: Omit<Pedido, 'id'>): Promise<number> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PEDIDOS_KEY);
    const pedidos: Pedido[] = raw ? JSON.parse(raw) : [];
    const novoId = pedidos.length > 0 ? Math.max(...pedidos.map(p => p.id)) + 1 : 1;
    pedidos.push({ ...pedido, id: novoId });
    await AsyncStorage.setItem(ASYNC_PEDIDOS_KEY, JSON.stringify(pedidos));
    return novoId;
  }

  const result = await db.runAsync(
    `INSERT INTO pedidos (data, horaEntrega, status, fornecedor, notaFiscalRecebida) VALUES (?, ?, ?, ?, ?)`,
    [pedido.data, pedido.horaEntrega || null, pedido.status, pedido.fornecedor.trim(), pedido.notaFiscalRecebida ? 1 : 0]
  );
  
  const pedidoId = result.lastInsertRowId;
  
  for (const item of pedido.itens) {
    await db.runAsync(
      `INSERT INTO itens_pedido (pedido_id, produto_codigo, quantidade, precoUnitario) VALUES (?, ?, ?, ?)`,
      [pedidoId, item.produtoCodigo, item.quantidade, item.precoUnitario || null]
    );
  }
  
  return pedidoId;
}

export async function listarPedidos(): Promise<Pedido[]> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PEDIDOS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  
  const pedidosRows = await db.getAllAsync<any>('SELECT * FROM pedidos ORDER BY id DESC');
  const pedidosMap = new Map<number, Pedido>();
  const ids: number[] = [];

  for (const row of pedidosRows) {
    pedidosMap.set(row.id, {
      id: row.id,
      data: row.data,
      horaEntrega: row.horaEntrega,
      status: row.status,
      fornecedor: row.fornecedor,
      notaFiscalRecebida: row.notaFiscalRecebida === 1,
      itens: []
    });
    ids.push(row.id);
  }

  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const itensRows = await db.getAllAsync<any>(
    `SELECT * FROM itens_pedido WHERE pedido_id IN (${placeholders})`, 
    ids
  );

  for (const itemRow of itensRows) {
    const pedido = pedidosMap.get(itemRow.pedido_id);
    if (pedido) {
      pedido.itens.push({
        produtoCodigo: itemRow.produto_codigo,
        quantidade: itemRow.quantidade,
        precoUnitario: itemRow.precoUnitario
      });
    }
  }
  
  return Array.from(pedidosMap.values());
}

export async function atualizarStatusPedido(id: number, status: 'aguardando' | 'entregue'): Promise<void> {
  if (!db) {
    const rawP = await AsyncStorage.getItem(ASYNC_PEDIDOS_KEY);
    let pedidos: Pedido[] = rawP ? JSON.parse(rawP) : [];
    const index = pedidos.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Pedido não encontrado');

    if (status === 'entregue' && pedidos[index].status !== 'entregue') {
      const rawProd = await AsyncStorage.getItem(ASYNC_PRODUCTS_KEY);
      let produtos: Produto[] = rawProd ? JSON.parse(rawProd) : [];

      pedidos[index].itens.forEach(item => {
        const pIdx = produtos.findIndex(p => p.codigo === item.produtoCodigo);
        if (pIdx !== -1) {
          produtos[pIdx].quantidade += item.quantidade;
          produtos[pIdx].ultimaEntrega = pedidos[index].data;
        }
      });
      await AsyncStorage.setItem(ASYNC_PRODUCTS_KEY, JSON.stringify(produtos));
    }
    pedidos[index].status = status;
    await AsyncStorage.setItem(ASYNC_PEDIDOS_KEY, JSON.stringify(pedidos));
    return;
  }

  await db.runAsync(`UPDATE pedidos SET status = ? WHERE id = ?`, [status, id]);
  
  if (status === 'entregue') {
    const itens = await db.getAllAsync<any>('SELECT * FROM itens_pedido WHERE pedido_id = ?', [id]);
    
    for (const item of itens) {
      await db.runAsync(
        `UPDATE products SET quantidade = quantidade + ?, ultimaEntrega = (SELECT data FROM pedidos WHERE id = ?) WHERE codigo = ?`,
        [item.quantidade, id, item.produto_codigo]
      );
      
      await db.runAsync(
        `INSERT INTO historico_movimentos (produto_codigo, data, tipo, quantidade, motivo, pedido_id) VALUES (?, date('now'), 'entrada', ?, ?, ?)`,
        [item.produto_codigo, item.quantidade, `Entrada via pedido #${id}`, id]
      );
    }
  }
}

export async function atualizarNotaFiscalPedido(id: number, recebida: boolean): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_PEDIDOS_KEY);
    let pedidos: Pedido[] = raw ? JSON.parse(raw) : [];
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) {
      pedidos[index].notaFiscalRecebida = recebida;
      await AsyncStorage.setItem(ASYNC_PEDIDOS_KEY, JSON.stringify(pedidos));
    }
    return;
  }
  
  await db.runAsync(`UPDATE pedidos SET notaFiscalRecebida = ? WHERE id = ?`, [recebida ? 1 : 0, id]);
}

/* ==========================================================================
   FUNÇÕES PARA GESTÃO DE CLIENTES / AUTENTICAÇÃO
   ========================================================================== */

export async function addCliente(cliente: any): Promise<void> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_CLIENTES_KEY);
    const clientes: any[] = raw ? JSON.parse(raw) : [];
    
    if (clientes.find(c => c.email === cliente.email)) {
      throw new Error('E-mail já cadastrado.');
    }
    if (clientes.find(c => c.cpf === cliente.cpf)) {
      throw new Error('CPF já cadastrado.');
    }
    
    clientes.push(cliente);
    await AsyncStorage.setItem(ASYNC_CLIENTES_KEY, JSON.stringify(clientes));
    return;
  }

  await db.runAsync(
    `INSERT INTO clientes (apelido, senha, nomeCompleto, endereco, numero, bairro, municipio, cpf, email, telefone) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cliente.apelido, 
      cliente.senha, 
      cliente.nomeCompleto, 
      cliente.endereco, 
      cliente.numero, 
      cliente.bairro, 
      cliente.municipio, 
      cliente.cpf, 
      cliente.email, 
      cliente.telefone
    ]
  );
}

export async function loginCliente(email: string, senha: string): Promise<Cliente> {
  if (!db) {
    const raw = await AsyncStorage.getItem(ASYNC_CLIENTES_KEY);
    const clientes: any[] = raw ? JSON.parse(raw) : [];
    const encontrado = clientes.find(c => c.email === email && c.senha === senha);
    
    if (!encontrado) {
      throw new Error('E-mail ou senha inválidos.');
    }
    return encontrado;
  }

  const encontrado = await db.getFirstAsync<Cliente>(
    'SELECT * FROM clientes WHERE email = ? AND senha = ?',
    [email, senha]
  );

  if (!encontrado) {
    throw new Error('E-mail ou senha inválidos.');
  }
  
  return encontrado;
}