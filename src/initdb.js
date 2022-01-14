import * as fs from 'fs'
import * as path from 'path'
import * as Stream from 'stream'
import initSqlJs from "sql.js/dist/sql-wasm.js";
import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'
import Handlebars from "handlebars";

Handlebars.registerHelper('notEmpty', function (arg1, options) {
  return (arg1 && arg1 != "''") ? options.fn(this) : options.inverse(this);
});

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
            const preparesTemplate = Handlebars.compile(iterator.sql);
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
              const preparesTemplate = Handlebars.compile(iterator.sql);
              const dataPath = path.normalize(path.join(settings.workspace, iterator.file)).replace(/\\/g, "/")
              const parser = fs
                .createReadStream(dataPath, "utf8")
                .pipe(parse({
                  // CSV options if any
                  columns: true,
                  skip_empty_lines: true
                }));
              for await (const record of parser) {
                // Work with each record
                try {
                  const mod_values = Object.fromEntries(
                    Object.entries(record)
                      .map(([_, value]) => [_.replace(/[\n\r\s\&]/g, '').replace(/\(.+\)/g, ''), "'" + value.replace(/\'/g, "''").replace(/\r\n/g, "'||char(13, 10)||'").replace(/\n/g, "'||char(13, 10)||'").replace(/\t/g, "'||char(9)||'") + "'"])
                  )
                  const sql = preparesTemplate({ table: iterator.table, values: mod_values });
                  try {
                    const res = db.run(sql)
                  } catch (e) {
                    if (instance.debug) {
                      console.error(e.message, sql, mod_values, e);
                    } else {
                      console.error(e.message, sql);
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
                console.error(e.message);
              }
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