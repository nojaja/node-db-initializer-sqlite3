const fs = require('fs')
const path = require('path')
const Initdb = require('../dist/initdb.bundle.js')


async function main() {
    const initdb = new Initdb()
    const configPath = path.normalize(path.join(process.cwd(),'/test.json')).replace(/\\/g, "/")
    const configdata = require(configPath)
    configdata.workspace = path.dirname(configPath)
    console.log("configdata",configdata)
    const content = await initdb.init(configdata);
    console.log('dump db data',content)
    
    async function save(savedata) {
        fs.writeFileSync('test2.db', savedata);
    }

    await save(content)
}
main();
