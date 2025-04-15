import * as fs from 'fs'
import * as Path from 'path'
import * as Stream from 'stream'
import SQLiteManager from './SQLiteManager.js'
import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'


export class Initdb {
  /**
   * constructor
   * @param {bool} debug
   */
  constructor(debug) {
    this.debug = debug || false
  }


  normalizePath(targetPath,basePath) {
    const _basePath = basePath || process.cwd()
    return Path.normalize((Path.isAbsolute(targetPath)) ? targetPath : Path.join(_basePath, targetPath)).replace(/\\/g, "/")
  }

  resultsPrint(results) {
    if (results) {
      for (const result of results) {
        console.log("Result ")
        const header = result.columns.reduce(function (previousValue, currentValue, index, array) {
          return previousValue + "\t" + currentValue;
        });
        console.log(header)
        for (const row of result.values) {
          const rowtext = row.reduce(function (previousValue, currentValue, index, array) {
            return previousValue + "\t" + currentValue;
          });
          console.log(rowtext)
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
        const data = (dbfile_path) ? new Uint8Array(fs.readFileSync(dbfile_path)) : null;
        // SQLite WAMSの初期化
        this.sqliteManager = await SQLiteManager.initialize(data, {
          print: console.log,
          printErr: console.error
        });

        //configのdataに定義されている処理を上から順番に実行する
        for await (const iterator of config.data || []) {
          console.log("Action ", iterator.action)
          try {

            //Execute-SQLの処理、configのdataに定義されているSQLを実行する
            if (iterator.action === 'Execute-SQL' && iterator.sql) {
              try {
                const results = this.sqliteManager.db.exec(iterator.sql)
                instance.resultsPrint(results)
              } catch (e) {
                if (instance.debug) {
                  console.error(e.message, iterator);
                } else {
                  console.error(e.message, iterator.sql);
                }
              }
            }

            //Execute-SQLの処理、configのfileに定義されているSQLを実行する
            if (iterator.action === 'Execute-SQL' && iterator.file) {
              try {
                const sqlPath = instance.normalizePath(iterator.file,config.workspace)
                const sql = fs.readFileSync(sqlPath, "utf8");
                try {
                  const results = this.sqliteManager.db.exec(sql)
                  instance.resultsPrint(results)
                } catch (e) {
                  if (instance.debug) {
                    console.error(e.message, sql, iterator);
                  } else {
                    console.error(e.message, sql);
                  }
                }
              } catch (e) {
                if (instance.debug) {
                  console.error(e.message, iterator);
                } else {
                  console.error(e.message);
                }
              }
            }

            //Export-CSVの処理、configのsqlに定義されているSQLを実行し結果をfileに書き出す
            if (iterator.action === 'Export-CSV' && iterator.sql && iterator.file) {
              try {
                const dataPath = instance.normalizePath(iterator.file,config.workspace)
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
                  console.log('Export-CSV: finish write stream', dataPath)
                }).on('error', (err) => {
                  console.log(err)
                })

                //SQLの実行と結果のreadableStreamへの書き込み
                while (stmt.step()) readStream.push(stmt.get());
                readStream.push(null)
                //stmt解放
                stmt.free()

              } catch (e) {
                if (instance.debug) {
                  console.error(e.message, iterator);
                } else {
                  console.error(e.message, iterator.sql);
                }
              }

            }

            //Import-CSVの処理、configのfileに定義されているcsvを読み込み、sqlに定義されているSQLにbindして実行する
            if (iterator.action === 'Import-CSV' && iterator.file) {
              try {
                const processFile = async () => {
                  const dataPath = instance.normalizePath(iterator.file,config.workspace)
                  const readStream = fs.createReadStream(dataPath, "utf8")

                  //prepare作成
                  const stmt = this.sqliteManager.db.prepare(iterator.sql)

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
                        //SQLの実行
                        stmt.bind(mod_values);
                        //結果の取得、基本INSERTなので結果の処理は適当
                        while (stmt.step()) console.log("stmt.get", stmt.get());
                      } catch (e) {
                        if (instance.debug) {
                          console.error(e.message, iterator.sql, mod_values, e);
                        } else {
                          console.error(e.message, iterator.sql);
                        }
                      }
                    } catch (e) {
                      if (instance.debug) {
                        console.error(e.message, record, e);
                      } else {
                        console.error(e.message, record);
                      }
                    }
                  }
                  return
                }
                const ret = await processFile()
              } catch (e) {
                if (instance.debug) {
                  console.error(iterator, e.message, e);
                } else {
                  console.error(iterator, e.message);
                }
              }
            }

          } catch (e) {
            if (instance.debug) {
              console.error(e.message, iterator, e);
            } else {
              console.error(e.message, iterator);
            }
          }
        }
        const content = await this.sqliteManager.export();
        return content;

    } catch (e) {
      if (instance.debug) {
        console.error(e.message, e);
      } else {
        console.error(e.message);
      }
    }
  }

}


export default Initdb