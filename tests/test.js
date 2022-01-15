const fs = require('fs')
const Path = require('path')
const Initdb = require('../dist/initdb.bundle.js')
const initdb = new Initdb(true)


async function proc(config, output, input) {
    const configPath = initdb.normalizePath(config)
    const inputDBPath = (input) ? initdb.normalizePath(input) : input
    const outputDBPath = initdb.normalizePath(output)
    const configdata = require(configPath)
    configdata.workspace = Path.dirname(configPath)
    console.log("proc", config, output, input)
    const content = await initdb.init(configdata, inputDBPath);
    //console.log('dump db data',content)
    async function save(savedata) {
        fs.writeFileSync(outputDBPath, savedata);
    }
    await save(content)
}

async function main() {
    await proc('test.json', '../test.db');
    await proc('test2.json', '../test2.db', '../ssa-babynames-nationwide-since-1980.sqlite'); //http://2016.padjo.org/files/data/starterpack/ssa-babynames/ssa-babynames-nationwide-since-1980.sqlite
    await proc('test3.json', '../test3.db');
    await proc('test4.json', '../test4.db', '../test3.db');
    // http://jusyo.jp/sqlite/new.php
    // http://jusyo.jp/downloads/new/sqlite/sqlite_zenkoku.zip
    await proc('test5.json', '../test5.db', '../zenkoku.sqlite3'); 
}
main();
