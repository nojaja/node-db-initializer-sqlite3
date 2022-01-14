
import * as fs from 'fs'
import * as path from 'path'
import { Command } from 'commander'
import Initdb from './initdb.js'
const program = new Command();
program.version('0.0.1');

program
  .option('-d, --debug', 'output extra debugging')
  .requiredOption('-c, --config <type>', 'config file path')
  .option('-i, --input <type>', 'input db file path')
  .requiredOption('-o, --output <type>', 'output db file path')

program.parse(process.argv);

const options = program.opts();
if (options.debug) console.log(options);
if (options.config) console.log(`config - ${options.config}`);
if (options.input) console.log(`input - ${options.input}`);
if (options.output) console.log(`output - ${options.output}`);

const main = async () => {
  const initdb = new Initdb()
  const configPath = path.normalize(path.join(process.cwd(),options.config)).replace(/\\/g, "/")
  const configdata = JSON.parse(fs.readFileSync(configPath, "utf8"));
  configdata.workspace = path.dirname(configPath)
  const content = await initdb.init(configdata,options.input);
  
  async function save(savedata) {
      fs.writeFileSync(options.output, savedata);
  }

  await save(content)
}
main();

