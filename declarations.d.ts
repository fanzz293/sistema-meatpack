// No seu declarations.d.ts, substitua a seção do expo-sqlite por esta:
declare module 'expo-sqlite' {
  export interface SQLiteDatabase {
    runAsync(sql: string, params?: any[]): Promise<any>;
    getAllAsync<T = any>(sql: string, params?: any[]): Promise<T[]>;
    getFirstAsync<T = any>(sql: string, params?: any[]): Promise<T | null>;
    execAsync(sql: string): Promise<void>;
    withTransactionAsync(callback: () => Promise<void>): Promise<void>;
  }
  export function openDatabaseSync(name: string): SQLiteDatabase;
}