import * as sourceMapSupport from 'source-map-support'

//デバッグ用のsourceMap設定
sourceMapSupport.install();
// Polyfill fetch for remote model loading in Node
import fetch from 'node-fetch';
if (typeof globalThis.fetch !== 'function') globalThis.fetch = fetch;

// Polyfill global objects for UMD transformers build in Node
if (typeof self === 'undefined') global.self = global;
if (typeof window === 'undefined') global.window = global;

// Polyfills and env settings for transformers.js (sample01 style)
import nodeFetch from 'node-fetch';
// Fetch API
if (typeof globalThis.fetch !== 'function') globalThis.fetch = nodeFetch;
global.Headers = nodeFetch.Headers;
global.Request = nodeFetch.Request;
global.Response = nodeFetch.Response;

const EmbeddingModel = 'Xenova/multilingual-e5-large'; //600MB
//const EmbeddingModel = 'intfloat/multilingual-e5-large'; //2.24GB
//const EmbeddingModel = 'cl-nagoya/ruri-large-v3'; //337MB

class EmbeddingManager {
    // シングルトンインスタンスを保持する静的プロパティ
    static #instance = null;
    /**
     * EmbeddingManagerのコンストラクタ
     */
    constructor(options = {}) {
        // 既にインスタンスが存在する場合はエラー
        if (EmbeddingManager.#instance) {
            throw new Error('EmbeddingManagerは直接インスタンス化できません。getInstance()を使用してください。');
        }
        this.print = options.print || (() => { });
        this.printErr = options.printErr || (() => { });
        // このインスタンスを唯一のインスタンスとして設定
        EmbeddingManager.#instance = this;
    }

    /**
     * EmbeddingManagerを初期化する静的メソッド
     * @param {ArrayBuffer} data - 既存のデータベースデータ（オプション） 
     * @returns {Promise<EmbeddingManager>} 初期化されたEmbeddingManagerインスタンス
     */
    static async initialize(options) {
        // Create and initialize singleton if needed
        if (!EmbeddingManager.#instance) {
            const instance = new EmbeddingManager(options);
            try {
                await instance.setupEmbeddingEnvironment();
            } catch (e) {
                // Fallback stub: returns zero vector
                instance.printErr('EmbeddingManager 初期化エラー; ' + e.message);
                throw e;
            }
            return instance;
        }
        return EmbeddingManager.#instance;
    }

    /**
     * 埋め込み環境のセットアップ
     * @returns {Promise<void>}
     */
    async setupEmbeddingEnvironment() {
        this.print('Embeddingパイプラインを初期化中...');
        this.print('Embedding Model:' + EmbeddingModel + 'を取得中...');
        // Load transformers synchronously with error handling
        let pipeline, env;
        try {
            const transformersModule = require('@xenova/transformers');
            const transformers = transformersModule.default ?? transformersModule;
            pipeline = transformers.pipeline;
            env = transformers.env;
        } catch (e) {
            this.printErr('Transformers モジュールの読み込みに失敗; ' + e.message);
            throw e;
        }
        // Configure environment for local model loading (embedded in pkg assets)
        if (env) {
            const path = require('path');
            // models_cache directory side-by-side with bundle, included via pkg assets
            const srcModels = path.resolve(path.dirname(__filename), '../models_cache');
            env.cacheDir = srcModels;
            env.allowLocalModels = true;
            env.useBrowserCache = false;
            if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
                env.backends.onnx.wasm.wasmPaths = srcModels;
            }
        }
        // Initialize embedding pipeline using local model cache
        try {
            this.embeddingPipeline = await pipeline('feature-extraction', EmbeddingModel, {device: 'webgpu'});
            this.print('Embeddingパイプラインの初期化が完了しました');
        } catch (e) {
            this.printErr('Embeddingパイプラインの初期化に失敗しました: ' + e.message);
            throw e;
        }
    }

    /**
     * テキストの埋め込みベクトルを生成する
     * @param {string} text - 埋め込みベクトル化するテキスト
     * @returns {Promise<Float32Array>} 埋め込みベクトル
     */
    async generateEmbedding(text) {
        const output = await this.embeddingPipeline(text, { pooling: 'mean', normalize: true });
        //return new Float32Array(Array.from(output.data));
        return new Float32Array(output.data).buffer;
    }

}

export default EmbeddingManager;