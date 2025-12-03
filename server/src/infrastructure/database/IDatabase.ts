export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface IDatabase {
 
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  insert<T = any>(table: string, data: Partial<T>): Promise<T>;
  update<T = any>(
    table: string,
    data: Partial<T>,
    where: Record<string, any>
  ): Promise<T[]>;
  delete(table: string, where: Record<string, any>): Promise<number>;
  find<T = any>(
    table: string,
    where?: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDir?: 'asc' | 'desc';
      select?: string[];
    }
  ): Promise<T[]>;

  findOne<T = any>(table: string, where: Record<string, any>): Promise<T | null>;
  count(table: string, where?: Record<string, any>): Promise<number>;
  transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T>;


  healthCheck(): Promise<boolean>;

  close(): Promise<void>;

 
  getType(): 'postgres' | 'convex';
}
