const fs = require('fs')
const path = require('path')
const initdb = require('../src/main.js')


async function main() {
    //initdb.init('test.db', require('./test.json') )
    console.log(initdb)
    const conf = JSON.parse(fs.readFileSync(path.join(process.cwd(),'/test.json'), "utf8"));
    console.log("conf",conf)
    const content = await initdb.init(conf);
    console.log('dump db data',content)
    
    async function save(savedata) {
        fs.writeFileSync('test2.db', savedata);
    }

    await save(content)
}
main();
