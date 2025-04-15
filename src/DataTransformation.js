import jsonata from "jsonata";


class DataTransformation {
    /**
     * DataTransformationのコンストラクタ
     */
    constructor(options = {}) {
        this.print = options.print || (() => { });
        this.printErr = options.printErr || (() => { });
        this.jsonata = jsonata;
        this.registeredFunctions = new Map(); // 登録された関数を保持するマップ
    }

    /**
     * DataTransformationを初期化する静的メソッド
     * @returns {Promise<DataTransformation>} 初期化されたDataTransformationインスタンス
     */
    static async initialize(options) {
        const instance = new DataTransformation(options);
        // 追加の初期化処理（必要に応じて実装）
        await instance.setupEmbeddingEnvironment();
        return instance;
    }

    /**
     * 埋め込み環境のセットアップ
     * @returns {Promise<void>}
     */
    async setupEmbeddingEnvironment() {

    }

    /**
     * JSONataの式に登録できる関数を事前に登録する
     * @param {string} name - 関数名
     * @param {Function} func - 登録する関数
     * @param {string} signature - 関数のシグネチャ（オプション）
     * @returns {DataTransformation} メソッドチェーン用のインスタンス
     */
    registerFunction(name, func, signature) {
        this.registeredFunctions.set(name, { func, signature });
        return this; // メソッドチェーンのためにthisを返す
    }

    prepare(query) {
        const expression = this.jsonata(query);
        
        // 事前に登録された関数を全てJSONata式に登録
        this.registeredFunctions.forEach((config, name) => {
            expression.registerFunction(name, config.func, config.signature);
        });

        return expression;
    }

    evaluate(query, data) {
        return this.prepare(query).evaluate(data);
    }
}

export default DataTransformation;