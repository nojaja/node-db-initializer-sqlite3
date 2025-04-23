import * as path from 'path'
import * as fs from 'fs'
import { Command } from 'commander'
import PathUtil from '@nojaja/pathutil'
import Initdb from './initdb.js'
import * as sourceMapSupport from 'source-map-support'

//デバッグ用のsourceMap設定
sourceMapSupport.install();

/*起動パラメータ設定 */
const version = (typeof __VERSION__) !== 'undefined' ? __VERSION__ : 'dev'; //__VERSION__はビルド時にwebpackのDefinePluginによって書き換えられます。

const program = new Command();
program.version(version);

program
  .option('-d, --debug', 'output extra debugging')
  .requiredOption('-c, --config <type>', 'config file path')
  .option('-i, --input <type>', 'input db file path')
  .requiredOption('-o, --output <type>', 'output db file path')

program.parse(process.argv);

const options = program.opts();
if (options.debug) console.log(options);

//各種fileの場所はCurrent directoryを基準に取得する
//入力先の絶対パス取得
const configPath = PathUtil.normalizeSeparator(PathUtil.absolutePath(options.config));
const inputDBPath = (options.input) ? PathUtil.normalizeSeparator(PathUtil.absolutePath(options.input)) : null;
const outputDBPath = PathUtil.normalizeSeparator(PathUtil.absolutePath(options.output));
if (options.config) console.log(`config - ${configPath}`);
if (options.input) console.log(`input - ${inputDBPath}`);
if (options.output) console.log(`output - ${outputDBPath}`);

const main = async () => {
  const startTime = process.hrtime();
  process.on('exit', exitCode => {
    //後始末処理
    const endTimeArray = process.hrtime(startTime);
    const memoryUsage = process.memoryUsage();
    function toMByte(byte) {
      return `${Math.floor((byte / 1024 / 1024) * 100) / 100}MB`
    }
    const _memoryUsage = JSON.stringify({
      "rss": toMByte(memoryUsage.rss),
      "heapTotal": toMByte(memoryUsage.heapTotal),
      "heapUsed": toMByte(memoryUsage.heapUsed),
      "external": toMByte(memoryUsage.external),
      "arrayBuffers": toMByte(memoryUsage.arrayBuffers)
    });
    console.log(`process statistics - Execution time: ${endTimeArray[0]}s ${endTimeArray[1] / 1000000}ms, memoryUsage: ${_memoryUsage}`);
  });
  try {
    //設定ファイルの読み込み
    const configdata = JSON.parse(fs.readFileSync(configPath, "utf8"));
    //config.jsonの中で指定されている各種filepathの場所はconfig.jsonのpathを基準に相対パス指定とする
    configdata.workspace = path.dirname(configPath);
    if (options.debug) console.log(`config data - ${configdata}`);

    const initdb = new Initdb({
      print: console.log,
      printErr: console.error,
      debug: options.debug
    });
    const content = await initdb.init(configdata, inputDBPath);
    async function save(savedata) {
      fs.writeFileSync(outputDBPath, savedata);
    }
    if (content == null) {
      throw new Error('保存するデータがありません');
    }
    await save(content);

  } catch (error) {
    console.error(`fatal: ${error}`);
    process.exitCode = 1;
    return;
  }
};
//メイン処理実行
await main();

