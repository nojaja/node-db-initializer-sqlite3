const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js/dist/sql-wasm')
const {parse} = require('csv-parse/sync')
const Handlebars = require('handlebars')

Handlebars.registerHelper('notEmpty', function(arg1, options) {
  return ( arg1 && arg1!="''" ) ? options.fn(this) : options.inverse(this);
});


module.exports.init = async function (settings) {
  const _settings = settings || {}
  return await initSqlJs().then(function (SQL) {
    // Load the db  
    const db = new SQL.Database();
    for (const iterator of settings.data||[]) {
      if(iterator.type==='sql' && iterator.sql){
        try {
          const res = db.exec(iterator.sql)
          console.log(res)
        } catch(e) {
          console.error(iterator,e.message);
        }
      }

      if(iterator.type==='sql' && iterator.file){
        try {
          const sqlPath = path.normalize(process.cwd() + iterator.file).replace(/\\/g, "/")
          const sql = fs.readFileSync(sqlPath, "utf8");
          try {
            const res = db.run(sql)
          } catch(e) {
            console.error(e.message,sql);
          }
        } catch(e) {
          console.error(iterator,e.message);
        }
      }

      if(iterator.type==='csv' && iterator.file){
        try {
          const dataPath = path.normalize(process.cwd() + iterator.file).replace(/\\/g, "/")
          const data = fs.readFileSync(dataPath, "utf8");
          const preparesTemplate = Handlebars.compile(iterator.sql);
          const records = parse(data, {
            columns: true,
            skip_empty_lines: true
          })
          for (const values of records) {
            try {
              const mod_values = Object.fromEntries(
                Object.entries( values )
                .map(([ _, value ] )  => [ _.replace(/[\n\r\s\&]/g, '').replace(/\(.+\)/g, ''), "'"+value.replace(/\'/g, "''").replace(/\r\n/g, "'||char(13, 10)||'").replace(/\n/g, "'||char(13, 10)||'").replace(/\t/g, "'||char(9)||'")+"'"])
              )
              const sql = preparesTemplate({ table: iterator.table, values: mod_values});
              try {
                const res = db.run(sql)
              } catch(e) {
                console.error(e.message,sql,mod_values,e);
              }
            } catch(e) {
              console.error(e.message,values,e);
            }
          }
        }
        catch(e) {
          console.error(iterator,e.message,e);
        }
      }
    }
    const content = db.export();
    return content;
  })
}