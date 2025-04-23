// SQLite モジュールをインポート
import * as sourceMapSupport from 'source-map-support'
import fs from 'fs';
import path from 'path';
// Base64 inline fallback for dev; external file for pkg

//デバッグ用のsourceMap設定
sourceMapSupport.install();

let sqlite3InitModuleFunc;

class SQLiteManager {
    static async initialize(data, options) {
        // Ensure global.window is set to simulate browser environment for wasm
        if (typeof window === 'undefined') global.window = {};
        // Dynamically import sqlite3 wasm module on first call
        if (!sqlite3InitModuleFunc) {
            // Use require to bundle sqlite3InitModuleFunc into main chunk
            const module = require('sqlite-vec-wasm-demo');
            sqlite3InitModuleFunc = module.default;
        }
        // Load sqlite3.wasm from dist or pkg output directory
        const isPkg = process.pkg !== undefined;
        const wasmPath = isPkg
            ? path.join(path.dirname(process.execPath), 'sqlite3.wasm')
            : path.join(process.cwd(), 'dist', 'sqlite3.wasm');
        const wasmBinary = fs.readFileSync(wasmPath);
        // Initialize wasm module
        const sqlite3 = await sqlite3InitModuleFunc({
            print: options.print || (() => {}),
            printErr: options.printErr || (() => {}),
            wasmBinary,
            instantiateWasm: (imports, successCallback) => {
                WebAssembly.instantiate(wasmBinary, imports)
                    .then(({ instance, module }) => successCallback(instance, module));
                return {};
            }
        });

        const sqlite3_instance = new SQLiteManager(sqlite3, options);
        await sqlite3_instance.setupEnvironment(data);
        return sqlite3_instance;
    }

    constructor(sqlite3, options = {}) {
        this.print = options.print || (() => { });
        this.printErr = options.printErr || (() => { });
        this.sqlite3 = sqlite3;
        this.original = { db: {} };
        this.db = null;
    }

    async setupEnvironment(data) {
        // ファイル名生成
        this.currentFilename = "dbfile_" + (0xffffffff * Math.random() >>> 0);
        if (data && data.length) {
            // VFSを使用してデータをインポート
            this.sqlite3.capi.sqlite3_js_vfs_create_file(
                'unix',
                this.currentFilename,
                data,
                data.length
            );
        }
        // データベースを作成
        this.db = new this.sqlite3.oo1.DB(this.currentFilename, "c");
        // sqlite3_instanceにoriginalプロパティを作成
        this.original = { db: {} };

        // 元のprepareメソッドを保存
        this.original.db.prepare = this.db.prepare;
        this.original.db.exec = this.db.exec;

        // db.prepareをオーバーライド
        this.db.prepare = (sql) => {
            // 元のprepareメソッドを呼び出し
            const stmt = this.original.db.prepare.call(this.db, sql);
            // SQLiteManagerのカスタマイズを適用
            stmt.getRowAsObject = () => this.getRowAsObject.call(this, stmt);
            stmt.getAsObject = () => this.getRowAsObject.call(this, stmt); //sql.js
            stmt._bind = stmt.bind;
            stmt.bind = (...args) => {
                return this.bind.apply(this, [stmt, ...args]);
            }

            return stmt;
        };
        // db.execをオーバーライド
        this.db.exec = (sql, bind) => {
            const results = [];
            let columnNames = [];
            try {
                this.original.db.exec.call(this.db, {
                    sql: sql,
                    bind: bind,
                    rowMode: 'object',
                    callback: (row) => {
                        columnNames = Array.from(new Set([...columnNames, ...Object.keys(row)]));
                        results.push(Object.values(row));
                    }
                });
                return [{
                    columns: columnNames,
                    values: results
                }];
            } catch (error) {
                throw error;
            }
        };
    }
    
    // ヘルパーメソッド：行データをオブジェクトとして取得
    getRowAsObject(stmt) {
        const obj = {};
        const columnNames = stmt.getColumnNames();
        for (let i = 0; i < columnNames.length; i++) {
            obj[columnNames[i]] = stmt.get(i);
        }
        return obj;
    }

    // ヘルパーメソッド：バインドオブジェクトをフィルタリングしてバインドする
    filteredBindObject(stmt, bindObject) {
        if (bindObject && typeof bindObject === 'object') {
            return Object.fromEntries(
                Object.entries(bindObject).filter(([key, _]) => 0 !== this.sqlite3.capi.sqlite3_bind_parameter_index(stmt.pointer, key))
            );
        } else {
            return bindObject;
        }
    }

    bind(stmt, ...args) {
        stmt.reset();
        if (args.length === 1 && args[0] && typeof args[0] === 'object') {
            const bindObject = this.filteredBindObject(stmt, args[0]);
            return stmt._bind.apply(stmt, [bindObject]);
        } else {
            return stmt._bind.apply(stmt, ...args);
        }
    }

    export() {
        const exportedData = this.sqlite3.capi.sqlite3_js_db_export(this.db);
        return exportedData;
    }

    async import(contents) {
        this.db.close();
        await this.setupEnvironment(contents);
    }

    close() {
        this.db.close();
    }
}
export default SQLiteManager