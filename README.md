# node-db-initializer-sqlite3
Initialize DB schema and tables very quickly. and Available with the webpack plugin.

## Install
```$ npm install db-initializer-sqlite3```

## Usage
Writing the configuration.json  

| action | param   | description          |
|--------|---------|----------------------|
| Execute-SQL | sql : {A string containing some SQL-text to execute} | Execute an SQL query, and returns the result. |
| Execute-SQL | file : {A path to a SQL-text-file. If a URL is provided, it must use the file: protocol.} | Synchronously reads and execute the entire SQL-text of a file. Reference vthe relative path to ```file``` based on the configuration-file path directory. |
| Import-CSV | sql : {A string containing some prepare SQL to execute}<br />file : {A path to a CSV-file. If a URL is provided, it must use the file: protocol. } | Synchronously reads and execute the entire CSV-text of a file. SQL-templates is compatible with SQLite BindParams. Reference vthe relative path to ```file``` based on the configuration-file path directory.|
| Export-CSV | sql : {A string containing some SQL-text to execute}<br />file : {A path to a CSV-file. If a URL is provided, it must use the file: protocol. } | ASynchronously write and execute the entire CSV-text of a file. Reference vthe relative path to ```file``` based on the configuration-file path directory.|

### Example  
``` configuration.json
{
    "workspace": [workspace directory(option)]
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
            "sql": "INSERT INTO HOGE VALUES ($ProcessIdentifier,$LEVEL,$PARENT,$Process,$Category,$OriginalProcessIdentifier,$ExtendedDescription,'',$BriefDescription,$Domain,$VerticalGroup,$MaturityLevel,$Status)",
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

  #### Detailed explanation about Import-CSV
  sql parameter is compatible with SQLite BindParams.
  ###### Example 
  configuration.json 
  ```SQL-templates
  "sql": "INSERT INTO HOGE VALUES ($ProcessIdentifier,$LEVEL)"
  ```
  Import csv
  ```Import.csv
  Process,Process Identifier,LEVEL
  A,B,C
  ```
  result
  ```
  INSERT INTO HOGE VALUES ('B','C')
  ```

  ##### Rule to convert header name to BindParams
  ```
    replace(/[\n\r\s\&]/g, '') // [a&b] → [ab]  , [A and B] → [AandB]
    replace(/\(.+\)/g, '')     // [a(b)] → [ab]
  ```

### Building the database in node.js
The ```Initdb``` module provides utilities for Initialize DB schema and tables.

Install with npm package manager:  
```npm install db-initializer-sqlite3```

Load this library as follows:  
```
const Initdb = require('node-db-initializer-sqlite3')
const initdb = new Initdb()
```

Use code like this to build your database:
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

#### ```dbinit.init(settings[, dbfile_path])```

* `settings` {jsonObject} configuration.json data
* `dbfile_path` {string} load DB data
* Returns: {Promise} Export the database to an Uint8Array containing the SQLite database file


### Building the database in webpack.config.js

Install with npm package manager:  
```npm install db-initializer-sqlite3```

Use code like this to build your database:
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

### Building the database in windows-x86 exe
```
db-initializer-sqlite3.exe -c tests\test.json -o test.db   
```
#### options

* `-c, --config <type>` config file path
* `-i, --input <type>` input db file path(option)
* `-o, --output <type>` output db file path
* `-d, --debug` output extra debugging



## Development
1. init
```sh
$ npm install
```

2. build
```
npm run build
```

3. test 
```
cd tests && node test.js && cd ..
```

4. bundle test 
```
node dist\index.bundle.js -c tests\test.json -o test.db
```

5. exe build 
```
npm run nexebuild
```

6. exe test 
```
dist\bin\db-initializer-sqlite3.exe -c tests\test.json -o test.db
```

## Contribution
1. Fork ([https://github.com/nojaja/node-db-initializer-sqlite3](https://github.com/nojaja/node-db-initializer-sqlite3))
2. Create a feature branch
3. Commit your changes
4. Rebase your local changes against the master branch
5. Run test suite with the `node test.js` command and confirm that it passes
6. Create new Pull Request

## Dependencies
 * csv-parse
 * csv-stringify
 * sql.js

## License
Licensed under the [MIT](LICENSE) License.
