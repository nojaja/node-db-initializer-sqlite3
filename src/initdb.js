import * as fs from 'fs'
import * as Stream from 'stream'
import SQLiteManager from './SQLiteManager.js'
import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'
import PathUtil from '@nojaja/pathutil'
import DataTransformation from './DataTransformation.js'
import * as sourceMapSupport from 'source-map-support'

//デバッグ用のsourceMap設定
sourceMapSupport.install();


export class Initdb {
  /**
   * constructor
   * @param {bool} debug
   */
  constructor(options = {}) {
    this.print = options.print || (() => { });
    this.printErr = options.printErr || (() => { });
    this.debug = options.debug || false
  }

  /**
   * SQLiteの結果を表示する
   * @param {jsonObject} results
   */
  resultsPrint(results) {
    if (results) {
      for (const result of results) {
        this.print("Result ")
        const header = result.columns.reduce(function (previousValue, currentValue, index, array) {
          return previousValue + "\t" + currentValue;
        });
        this.print(header)
        for (const row of result.values) {
          const rowtext = row.reduce(function (previousValue, currentValue, index, array) {
            return previousValue + "\t" + currentValue;
          });
          this.print(rowtext)
        }
      }
    }
  }

  /**
   * SQLiteの読み込み
   * ex. const content = await initdb.init(configdata,options.input);
   * @param {jsonObject} config
   * @param {string} dbfile_path filename or file descriptor
   * @returns {Promise} db Promise
   */
  async init(config, dbfile_path) {
    const instance = this
    try {
      //各種fileの相対パスの基準となるworkspaceが指定されてない場合はCurrent directoryを設定する
      if (!config.workspace) config.workspace = process.cwd()

      // Load db  
      let data = null;
      if (dbfile_path && fs.existsSync(dbfile_path)) {
        data = new Uint8Array(fs.readFileSync(dbfile_path));
      } else {
        data = new Uint8Array(); // 空データを渡す
      }
      // SQLite WAMSの初期化
      this.sqliteManager = await SQLiteManager.initialize(data, {
        print: (this.debug) ? this.print : null,
        printErr: (this.debug) ? this.printErr : null
      });

      this.dataTransformation = await DataTransformation.initialize({
        print: this.print,
        printErr: this.printErr
      });

      //configのdataに定義されている処理を上から順番に実行する
      for await (const iterator of config.data || []) {
        this.print("Action ", iterator.action)
        try {

          //Execute-SQLの処理、configのdataに定義されているSQLを実行する
          if (iterator.action === 'Execute-SQL' && iterator.sql) {
            try {
              const results = this.sqliteManager.db.exec(iterator.sql)
              instance.resultsPrint(results)
            } catch (e) {
              if (instance.debug) {
                this.printErr(e.message, iterator);
              } else {
                this.printErr(e.message, iterator.sql);
              }
            }
          }

          //Execute-SQLの処理、configのfileに定義されているSQLを実行する
          if (iterator.action === 'Execute-SQL' && iterator.file) {
            try {

              const sqlPath = PathUtil.normalizeSeparator(PathUtil.absolutePath(iterator.file, config.workspace));
              const sql = fs.readFileSync(sqlPath, "utf8");
              try {
                const results = this.sqliteManager.db.exec(sql)
                instance.resultsPrint(results)
              } catch (e) {
                if (instance.debug) {
                  this.printErr(e.message, sql, iterator);
                } else {
                  this.printErr(e.message, sql);
                }
              }
            } catch (e) {
              if (instance.debug) {
                this.printErr(e.message, iterator);
              } else {
                this.printErr(e.message);
              }
            }
          }

          //Export-CSVの処理、configのsqlに定義されているSQLを実行し結果をfileに書き出す
          if (iterator.action === 'Export-CSV' && iterator.sql && iterator.file) {
            try {
              const dataPath = PathUtil.normalizeSeparator(PathUtil.absolutePath(iterator.file, config.workspace));
              const writeStream = fs.createWriteStream(dataPath, "utf8")
              const readStream = new Stream.Readable({ objectMode: true })
              //prepare作成
              const stmt = this.sqliteManager.db.prepare(iterator.sql)
              //CSV作成用の設定
              const resultsStringify = stringify({
                header: true,
                columns: stmt.getColumnNames()
              })

              readStream.pipe(resultsStringify).pipe(writeStream)

              //書き込み完了時の検知
              writeStream.on('finish', () => {
                this.print('Export-CSV: finish write stream', dataPath)
              }).on('error', (err) => {
                this.print(err)
              })

              //SQLの実行と結果のreadableStreamへの書き込み
              while (stmt.step()) readStream.push(stmt.get());
              readStream.push(null)
              //stmt解放
              stmt.free()

            } catch (e) {
              if (instance.debug) {
                this.printErr(e.message, iterator);
              } else {
                this.printErr(e.message, iterator.sql);
              }
            }

          }

          //Import-CSVの処理、configのfileに定義されているcsvを読み込み、sqlに定義されているSQLにbindして実行する
          if (iterator.action === 'Import-CSV' && iterator.file) {
            try {
              const processFile = async () => {
                const dataPath = PathUtil.normalizeSeparator(PathUtil.absolutePath(iterator.file, config.workspace));
                const readStream = fs.createReadStream(dataPath, "utf8")

                //prepare作成
                const stmt = this.sqliteManager.db.prepare(iterator.sql)

                const jsonata = (iterator.jsonata) ? this.dataTransformation.prepare(iterator.jsonata) : null;

                //CSVの読み込み設定とStream作成
                const parserStream = parse({
                  columns: true, //Columnは必ずあるとする
                  skip_empty_lines: true //空行はスキップ
                })

                readStream.pipe(parserStream)
                //parserStreamにて処理されたrecordを順次処理する
                for await (const record of parserStream) {
                  // Work with each record
                  try {
                    //CSVデータの加工
                    //columnNameをBindParamsで利用可能な名称に変更
                    //valueをSQLで扱えるようにエスケープ処理する ←不要
                    const mod_values = Object.fromEntries(
                      Object.entries(record)
                        //[columnName , value]
                        //.map(([columnName, value]) => ["$" + columnName.replace(/[\n\r\s\&]/g, '').replace(/\(.+\)/g, ''), value.replace(/\'/g, "''").replace(/\r\n/g, "'||char(13, 10)||'").replace(/\n/g, "'||char(13, 10)||'").replace(/\t/g, "'||char(9)||'")])
                        .map(([columnName, value]) => ["$" + columnName.replace(/[\n\r\s\&]/g, '').replace(/\(.+\)/g, ''), value])
                    ) // -> { '$Process': 'Gather Market Information', '$Category': 'Task',,,}
                    try {
                      const data = (jsonata) ? await jsonata.evaluate(mod_values) : mod_values; //jsonataの式を実行する
                      if (instance.debug && jsonata) {
                        this.print("jsonata", mod_values, "->", data);
                      }

                      //SQLの実行
                      stmt.bind(data);
                      //結果の取得、基本INSERTなので結果の処理は適当
                      while (stmt.step()) console.log("stmt.get", stmt.get());
                    } catch (e) {
                      if (instance.debug) {
                        this.printErr(e.message, iterator.sql, mod_values, e);
                      } else {
                        this.printErr(e.message, iterator.sql);
                      }
                    }
                  } catch (e) {
                    if (instance.debug) {
                      this.printErr(e.message, record, e);
                    } else {
                      this.printErr(e.message, record);
                    }
                  }
                }
                return
              }
              const ret = await processFile()
            } catch (e) {
              if (instance.debug) {
                this.printErr(iterator, e.message, e);
              } else {
                this.printErr(iterator, e.message);
              }
            }
          }

        } catch (e) {
          if (instance.debug) {
            this.printErr(e.message, iterator, e);
          } else {
            this.printErr(e.message, iterator);
          }
        }
      }
      const content = await this.sqliteManager.export();
      return content;

    } catch (e) {
      if (instance.debug) {
        this.printErr(e.message, e);
      } else {
        this.printErr(e.message);
      }
    }
  }

}


export default Initdb