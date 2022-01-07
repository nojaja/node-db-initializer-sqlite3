# node-db-initializer-sqlite3
Initialize DB schema and tables very quickly. and Available with the webpack plugin.


### Building the database in node.js
* Writing the configuration
```
{
    "data": [
        {
            "type": "sql",
            "sql": "CREATE TABLE hello (a int, b char);"
        },
        {
            "type": "sql",
            "file": "/tests/CREATE_TABLE.sql"
        },
        {
            "type": "csv",
            "table": "HOGE",
            "sql": "INSERT INTO {{table}} VALUES ({{{values.ProcessIdentifier}}},{{{values.LEVEL}}},{{{values.PARENT}}},{{{values.Process}}},{{{values.Category}}},{{{values.OriginalProcessIdentifier}}},{{{values.ExtendedDescription}}},'',{{{values.BriefDescription}}},{{{values.Domain}}},{{{values.VerticalGroup}}},{{{values.MaturityLevel}}},{{{values.Status}}} )",
            "file": "/tests/HOGE.csv"
        }
    ]
}
```
 ** csv format
  You can write in the handlebar template format
  Explain the structure of parameter
  ```
  {
    table: iterator.tableName,
    values: [Formatted CSV Header name]
    }

  ```
  Header name Format rule
  ```
    replace(/[\n\r\s\&]/g, '') // a&b → ab
    replace(/\(.+\)/g, '')     // a(b) → ab
  ```

* Use code like this to build your database.
```
const fs = require('fs')
const dbinit  = require('node-db-initializer-sqlite3')

async function main() {
    //dbinit.init(
    //    'DATABASE_PATH.db',
    //     require('PATH_TO_CONFIGURATION.json')
    //)

    const content = await dbinit.init(require('PATH_TO_CONFIGURATION.json') );
    
    async function save(content) {
        fs.writeFileSync('DATABASE_PATH.db', content);
    }
    await save(content)
}
main();
```



### Building the database in webpack.config.js
```
const webpack = require('webpack')
const dbinit  = require('node-db-initializer-sqlite3')
const CopyFilePlugin = require('copy-webpack-plugin')

module.exports = {
  plugins: [
    new CopyFilePlugin(
        [
            {
                from: 'assets/datas/*.json',
                to: dist+"/assets/[name].db",
                transform(content, absoluteFrom) {
                  return dbinit.init(require(absoluteFrom)).then(function (savedata) {
                          return savedata;
                        }
                    );
                }
            }
        ],
        { copyUnmodified: true }
    ),
    new WriteFilePlugin()
  ]
}
```