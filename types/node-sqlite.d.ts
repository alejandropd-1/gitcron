declare module 'node:sqlite' {
  export interface DatabaseSyncOptions {
    enableForeignKeyConstraints?: boolean;
  }

  export type SQLInputValue = null | number | bigint | string | Uint8Array;

  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export interface StatementSync {
    get(...anonymousParameters: SQLInputValue[]): Record<string, unknown> | undefined;
    all(...anonymousParameters: SQLInputValue[]): Record<string, unknown>[];
    run(...anonymousParameters: SQLInputValue[]): StatementResultingChanges;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
