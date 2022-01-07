# node-db-initializer-sqlite3
Initialize DB schema and tables very quickly. and Available with the webpack plugin.


### Building the database in node.js
*
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
                to: dist+"/assets/[name].db.gz",
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