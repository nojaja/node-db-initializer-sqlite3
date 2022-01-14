import * as fs from 'fs'
import * as path from 'path'
import * as Stream from 'stream'
import initSqlJs from "sql.js/dist/sql-wasm.js"
import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'


export class Initdb {
  constructor(debug) {
    this.debug = debug || false
  }

  resultsprocessor(results) {
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
   * @param {jsonObject} settings
   * @param {string} dbfile_path filename or file descriptor
   * @returns {Promise} db Promise
   */
  async init(settings, dbfile_path) {
    const instance = this
    try {
      const _settings = settings || {}
      if (!settings.workspace) settings.workspace = process.cwd()
      return await initSqlJs().then(async function (SQL) {
        // Load the db  
        const db = (dbfile_path) ? new SQL.Database(new Uint8Array(fs.readFileSync(dbfile_path))) : new SQL.Database();
        for await (const iterator of settings.data || []) {
          console.log("Action ", iterator.action)
          try {
            if (iterator.action === 'Execute-SQL' && iterator.sql) {
              try {
                const results = db.exec(iterator.sql)
                instance.resultsprocessor(results)
              } catch (e) {
                if (instance.debug) {
                  console.error(e.message, iterator);
                } else {
                  console.error(e.message, iterator.sql);
                }
              }
            }

            if (iterator.action === 'Execute-SQL' && iterator.file) {
              try {
                const sqlPath = path.normalize(path.join(settings.workspace, iterator.file)).replace(/\\/g, "/")
                const sql = fs.readFileSync(sqlPath, "utf8");
                try {
                  const results = db.exec(sql)
                  instance.resultsprocessor(results)
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

            if (iterator.action === 'Export-CSV' && iterator.sql && iterator.file) {
              const dataPath = path.normalize(path.join(settings.workspace, iterator.file)).replace(/\\/g, "/")
              const writeStream = fs.createWriteStream(dataPath, "utf8")
              const readableStream = new Stream.Readable({ objectMode: true })
              try {
                const stmt = db.prepare(iterator.sql)

                const resultsStringify = stringify({
                  header: true,
                  columns: stmt.getColumnNames()
                })

                readableStream.pipe(resultsStringify).pipe(writeStream)
                writeStream.on('finish', () => {
                  console.log('Export-CSV: finish write stream', dataPath)
                }).on('error', (err) => {
                  console.log(err)
                })

                while (stmt.step()) readableStream.push(stmt.get());
                readableStream.push(null)

              } catch (e) {
                if (instance.debug) {
                  console.error(e.message, iterator);
                } else {
                  console.error(e.message, iterator.sql);
                }
              }

            }

            if (iterator.action === 'Import-CSV' && iterator.file) {
              const processFile = async () => {
                const dataPath = path.normalize(path.join(settings.workspace, iterator.file)).replace(/\\/g, "/")
                const parser = parse({
                  // CSV options if any
                  columns: true,
                  skip_empty_lines: true
                })
                const readStream = fs.createReadStream(dataPath, "utf8")
                readStream.pipe(parser)
                const stmt = db.prepare(iterator.sql)
                for await (const record of parser) {
                  // Work with each record
                  try {
                    const mod_values = Object.fromEntries(
                      Object.entries(record)
                        //[columnName , value]
                        //.map(([_, value]) => [_.replace(/[\n\r\s\&]/g, '').replace(/\(.+\)/g, ''), "'" + value.replace(/\'/g, "''").replace(/\r\n/g, "'||char(13, 10)||'").replace(/\n/g, "'||char(13, 10)||'").replace(/\t/g, "'||char(9)||'") + "'"])
                        //.map(([columnName, value]) => [columnName, value.replace(/\'/g, "''").replace(/\r\n/g, "'||char(13, 10)||'").replace(/\n/g, "'||char(13, 10)||'").replace(/\t/g, "'||char(9)||'")])
                        .map(([columnName, value]) => ["$" + columnName.replace(/[\n\r\s\&]/g, '').replace(/\(.+\)/g, ''), value.replace(/\'/g, "''").replace(/\r\n/g, "'||char(13, 10)||'").replace(/\n/g, "'||char(13, 10)||'").replace(/\t/g, "'||char(9)||'")])
                    )
                    try {
                      stmt.bind(mod_values);
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
              try {
                const ret = await processFile()
              }
              catch (e) {
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
        const content = db.export();
        return content;
      })

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