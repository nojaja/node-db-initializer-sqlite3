// SQLite モジュールをインポート
import { default as init } from 'sql.js';

class SQLiteManager {
    static async initialize(data, options) {
        // SQLite モジュールを初期化
        const sqlite3 = await init({
            print: options.print || (() => { }),
            printErr: options.printErr || (() => { }),
            // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
            // You can omit locateFile completely when running in node
            //locateFile: file => `https://sql.js.org/dist/${file}`
            //locateFile: filename => `/dist/${filename}`
            //locateFile: file => './sql-wasm.wasm'
        });
        const sqlite3_instance = new SQLiteManager(sqlite3, data);
        // sqlite3_instanceにoriginalプロパティを作成
        sqlite3_instance.original = { db: {} };

        // 元のprepareメソッドを保存
        sqlite3_instance.original.db.prepare = sqlite3_instance.db.prepare;
        sqlite3_instance.original.db.exec = sqlite3_instance.db.exec;

        // db.prepareをオーバーライド
        sqlite3_instance.db.prepare = function (sql) {
            return sqlite3_instance.prepare(sql);
        };
        // db.execをオーバーライド
        sqlite3_instance.db.exec = function (sql, bind) {
            return sqlite3_instance.exec(sql, bind);
        };
        return sqlite3_instance;
    }

    constructor(sqlite3, data, options = {}) {
        this.print = options.print || (() => { });
        this.printErr = options.printErr || (() => { });
        this.sqlite3 = sqlite3;
        // データベースを作成
        this.db = new sqlite3.Database(data);
    }

    exec(sql, bind) {
        // 元のメソッドを呼び出し
        return this.original.db.exec.call(this.db, sql, bind);
    }

    prepare(sql) {
        // 元のメソッドを呼び出し
        return this.original.db.prepare.call(this.db, sql);
    }
    
    export() {
        const exportedData = this.db.export();
        return exportedData;
    }

    async import(contents) {
        this.db.close();
        this.db = new this.sqlite3.Database(contents);
    }

    close() {
        this.db.close();
    }
}
export default SQLiteManager