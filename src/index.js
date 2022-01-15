
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

const main = async () => {
  const initdb = new Initdb(options.debug)
  //各種fileの場所はCurrent directoryを基準に取得する、
  //Windowsの場合はPathを　\　⇒　/　に揃える
  const configPath = initdb.normalizePath(options.config)
  const inputDBPath = (options.input)? initdb.normalizePath(options.input) : options.input
  const outputDBPath = initdb.normalizePath(options.output)
  if (options.config) console.log(`config - ${configPath}`);
  if (options.input) console.log(`input - ${inputDBPath}`);
  if (options.output) console.log(`output - ${outputDBPath}`);

  const configdata = JSON.parse(fs.readFileSync(configPath, "utf8"));
  //config.jsonの中で指定されている各種filepathの場所はconfig.jsonのpathを基準に相対パス指定とする
  configdata.workspace = path.dirname(configPath)

  if (options.debug) console.log(`config data - ${configdata}`);

  const content = await initdb.init(configdata,inputDBPath);
  
  async function save(savedata) {
      fs.writeFileSync(outputDBPath, savedata);
  }

  await save(content)
}
main();

