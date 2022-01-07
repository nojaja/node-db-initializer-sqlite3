const fs = require('fs')
const initdb = require('../src/')
async function main() {
    //initdb.init('test.db', require('./test.json') )

    const content = await initdb.init(require('./test.json') );
    console.log('dump db data',content)
    
    async function save(savedata) {
        fs.writeFileSync('test2.db', savedata);
    }

    await save(content)
}
main();
