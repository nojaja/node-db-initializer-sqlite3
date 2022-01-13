
const { Command } = require('commander')
import * as fs from 'fs'
import * as path from 'path'
import Initdb from './initdb.js'
const program = new Command();
program.version('0.0.1');

program
  .option('-d, --debug', 'output extra debugging')
  .option('-c, --config <type>', 'config file path')
  .option('-i, --input <type>', 'input db file path')
  .option('-o, --output <type>', 'output db file path')

program.parse(process.argv);

const options = program.opts();
if (options.debug) console.log(options);
if (options.config) console.log(`config - ${options.config}`);
if (options.input) console.log(`input - ${options.input}`);
if (options.output) console.log(`output - ${options.output}`);


const Initdb_promise = async function () {
  return new Initdb()
}()


const main = async () => {
  const initdb = await Initdb_promise
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(),options.config), "utf8"));
  const content = await initdb.init(data,options.input);
  
  async function save(savedata) {
      fs.writeFileSync(options.output, savedata);
  }

  await save(content)
}
main();

