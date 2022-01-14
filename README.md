# node-db-initializer-sqlite3
Initialize DB schema and tables very quickly. and Available with the webpack plugin.


## Writing the configuration

## actions
| action | param   | description          |
|--------|---------|----------------------|
| Execute-SQL | sql : {A string containing some SQL-text to execute} | Execute an SQL query, and returns the result. |
| Execute-SQL | file : {A path to a SQL-text-file. If a URL is provided, it must use the file: protocol.} | Synchronously reads and execute the entire SQL-text of a file. Reference vthe relative path to ```file``` based on the configuration-file path directory. |
| Import-CSV | sql : {A string containing some SQL-templates to execute}<br />file : {A path to a CSV-file. If a URL is provided, it must use the file: protocol. } | Synchronously reads and execute the entire CSV-text of a file. SQL-templates is compatible with Handlebars templates. Reference vthe relative path to ```file``` based on the configuration-file path directory.|
| Export-CSV | sql : {A string containing some SQL-test to execute}<br />file : {A path to a CSV-file. If a URL is provided, it must use the file: protocol. } | ASynchronously write and execute the entire CSV-text of a file. Reference vthe relative path to ```file``` based on the configuration-file path directory.|

## Example 
configuration.json 
```
{
    "workspace": [workspace directory]
    "data": [
        {
            "action": "Execute-SQL",
            "sql": "CREATE TABLE hello (a int, b char);"
        },
        {
            "action": "Execute-SQL",
            "file": "/CREATE_TABLE.sql"
        },
        {
            "action": "Import-CSV",
            "sql": "INSERT INTO HOGE VALUES ({{{values.ProcessIdentifier}}},{{{values.LEVEL}}},{{{values.PARENT}}},{{{values.Process}}},{{{values.Category}}},{{{values.OriginalProcessIdentifier}}},{{{values.ExtendedDescription}}},'',{{{values.BriefDescription}}},{{{values.Domain}}},{{{values.VerticalGroup}}},{{{values.MaturityLevel}}},{{{values.Status}}} )",
            "file": "/HOGE.csv"
        },
        {
            "action": "Export-CSV",
            "sql": "SELECT * FROM HOGE;",
            "file": "/test.csv"
        }
    ]
}
```
  ### CSV-file format
  SQL-templates is compatible with Handlebars templates.
  #### Explain the structure of the Handlebars input object.
  ```
  {
    values: [Formatted CSV Header name]
  }
  ```
  ##### Example 
  configuration.json 
  ```SQL-templates
  "sql": "INSERT INTO HOGE VALUES ({{{values.ProcessIdentifier}}},{{{values.LEVEL}}})"
  ```
  input csv
  ```Example.csv
  Process,Process Identifier,LEVEL
  A,B,C
  ```
  result
  ```
  INSERT INTO HOGE VALUES ('B','C')
  ```

  #### Header name Format rule
  ```
    replace(/[\n\r\s\&]/g, '') // a&b → ab
    replace(/\(.+\)/g, '')     // a(b) → ab
  ```

## Building the database in node.js
The ```Initdb``` module provides utilities for Initialize DB schema and tables.

Install with npm package manager:
```npm install db-initializer-sqlite3```

Load this library as follows:
```
const Initdb = require('node-db-initializer-sqlite3')
const initdb = new Initdb()
```

### ```dbinit.init(settings[, dbfile_path])```

* `settings` {jsonObject} configuration.json data
* `dbfile_path` {string} load DB data
* Returns: {Promise} Export the database to an Uint8Array containing the SQLite database file

####  Use code like this to build your database.
```
const fs = require('fs')
const Initdb  = require('node-db-initializer-sqlite3')

async function main() {

    const initdb = new Initdb()
    const configdata = require('PATH_TO_CONFIGURATION.json')
    configdata.workspace = process.cwd()
    const content = await dbinit.init(configdata)
    
    async function save(content) {
        fs.writeFileSync('DATABASE_PATH.db', content)
    }
    await save(content)
}
main()
```


## Building the database in webpack.config.js
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

## Building the database in exe
```
db-initializer-sqlite3.exe -c \tests\test.json -o test.db   
```



## Development
1. init
```sh
$ npm install
```

2. build
```
npm run build && node dist\index.bundle.js -c \tests\test.json -o test.db
```

3. test 
```
cd tests && node test.js && cd ..
```

4. bundle test 
```
node dist\index.bundle.js -c \tests\test.json -o test.db
```

5. exe test 
```
npm run nexebuild && dist\bin\db-initializer-sqlite3.exe -c \tests\test.json -o test.db
```

## License
Licensed under the [MIT](LICENSE) License.
