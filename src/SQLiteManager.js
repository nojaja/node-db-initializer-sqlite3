// SQLite モジュールをインポート
import { default as init } from 'sql.js';
import * as sourceMapSupport from 'source-map-support';
import path from 'path';
import * as fs from 'fs';

//デバッグ用のsourceMap設定
sourceMapSupport.install();

class SQLiteManager {
    static async initialize(data, options) {
        // SQLite モジュールを初期化
        // Ensure global.window is set to simulate browser environment for wasm
        if (typeof window === 'undefined') global.window = {};
        // Dynamically import sqlite3 wasm module on first call
        let sqlite3 = null;
        if (typeof process !== 'undefined') { // node.js環境
            // Load sqlite3.wasm from dist or pkg output directory
            const isPkg = process.pkg !== undefined;
            const wasmPath = isPkg
                ? path.join(path.dirname(process.execPath), 'sql-wasm.wasm')
                : path.join(process.cwd(), 'dist', 'sql-wasm.wasm');
            const wasmBinary = fs.readFileSync(wasmPath);
            // Initialize wasm module
            sqlite3 = await init({
                print: options.print || (() => { }),
                printErr: options.printErr || (() => { }),
                wasmBinary,
                instantiateWasm: (imports, successCallback) => {
                    WebAssembly.instantiate(wasmBinary, imports)
                        .then(({ instance, module }) => successCallback(instance, module));
                    return {};
                }
            });
        } else { // ブラウザ環境
            sqlite3 = await init({
                print: options.print || (() => { }),
                printErr: options.printErr || (() => { }),
                // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
                // You can omit locateFile completely when running in node
                //locateFile: file => `https://sql.js.org/dist/${file}`
                //locateFile: filename => `/dist/${filename}`
                locateFile: file => './sql-wasm.wasm'
            });
        }

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
        // データベースを作成
        this.db = new this.sqlite3.Database(data);
        // sqlite3_instanceにoriginalプロパティを作成
        this.original = { db: {} };

        // 元のprepareメソッドを保存
        this.original.db.prepare = this.db.prepare;
        this.original.db.exec = this.db.exec;

        // db.prepareをオーバーライド
        this.db.prepare = (sql) => {
            return this.original.db.prepare.call(this.db, sql);
        };
        // db.execをオーバーライド
        this.db.exec = (sql, bind) => {
            return this.original.db.exec.call(this.db, sql, bind);
        };
    }

    export() {
        const exportedData = this.db.export();
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