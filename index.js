#! /usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const echonet = require('echonet-lite');
const cli = require('cac')();
const colors = require('colors');

const packagejson = require('./package.json');
const ofuroDB = require('./ofuro-db.json');
const configPath = path.join(os.homedir(), '.ofuro.config.json');

const ListIt = require("list-it");
const listit = new ListIt({
    headerBold: true,
    headerUnderline: true,
});

const ofuroLaunchDateObj = new Date();
const ofuroLaunchTimeStamp = ofuroLaunchDateObj.toISOString();

const redON = `${colors.red('ON')}`;
const cyanOFF = `${colors.cyan('OFF')}`;

console.log(`${colors.red.bold('♨')} ${colors.cyan.bold('ofuro')} ${colors.red.bold('♨')}`);

if (!fs.existsSync(configPath)) {
    console.error(`[${colors.red.bold('ERROR')}] 設定ファイルが見つかりません。`);
    fs.writeFile(configPath, `{"ip":"192.0.2.0"}`, (err) => {
        if (err) {
            console.error(`設定ファイルを書き込めませんでした。:\n${err}`);
            throw err;
        }
        else {
            console.log(`設定ファイルを以下のパスに作成しました。IPアドレスを書き換えてください。\n${configPath}`);
        }
    });
    return;
}

const config = JSON.parse(fs.readFileSync(configPath));
const controllerObjectId = [0x05, 0xff, 0x01]; //コントローラ
const bathControllerObjectId = [0x02, 0x72, 0x01]; //給湯器
const responseResultObj = {};

cli
    .command('on', '給湯器をONにします。')
    .action(() => {
        ofuroSet(0x80, 0x30);
        console.log(`給湯器を ${redON} にします。`);
    });

cli
    .command('off', '給湯器をOFFにします。')
    .action(() => {
        ofuroSet(0x80, 0x31);
        console.log(`給湯器を ${cyanOFF} にします。`);
    });

cli
    .command('auto', 'ふろ自動モード（湯沸かし）を開始します。')
    .action(() => {
        ofuroSet(0xE3, 0x41);
        console.log(`ふろ自動モードを ${redON} にします。`);
    });

cli
    .command('auto-stop', 'ふろ自動モード（湯沸かし）を解除・中止します。')
    .action(() => {
        ofuroSet(0xE3, 0x42);
        console.log(`ふろ自動モード（湯沸かし）を ${cyanOFF} にします。`);
    });

cli
    .command('reheat', '追いだきモードを開始します。')
    .action(() => {
        ofuroSet(0xE4, 0x41);
        console.log(`追いだきモードを ${redON} にします。`);
    });

cli
    .command('reheat-stop', '追いだきモードを解除・中止します。')
    .action(() => {
        ofuroSet(0xE4, 0x42);
        console.log(`追いだきモードを ${cyanOFF} にします。`);
    });

cli.command('send-el <deoj> <esv> <property> [...value]')
    .action((deoj, esv, property, value) => {
        echonetSend(deoj, esv, property, value[0]);
    });

cli
    .command('status', '設定温度など現在の状態を表示します。')
    .action(() => {
        (async () => {
            process.stdout.write('給湯リモコンの設定値を取得中……');
            echonet.initialize(['05ff01'], ofuroStatusMessageHandler);
            await sleep(500);
            await ofuroGet(0x80);
            await ofuroGet(0xD0);
            await ofuroGet(0xD1);
            await ofuroGet(0xE1);
            await ofuroGet(0xE2);
            await ofuroGet(0xE3);
            await ofuroGet(0xE4);
            await ofuroGet(0xE5);
            await ofuroGet(0xE6);
            await ofuroGet(0xD4);
            await ofuroGet(0xD5);
            await ofuroGet(0x88);
            process.stdout.write("\r\x1b[K")
            showStatus(responseResultObj);
            process.exit();
        })();
    });

cli
    .command('watch', 'メッセージを待ち受け、ログとして表示します。')
    .option('--csv', 'CSV形式でログを表示します')
    .action((options) => {
        (async () => {
            const currentDateObj = new Date();
            if (options.csv) {
                fs.writeFileSync(`${ofuroLaunchTimeStamp}.csv`, `timestamp,SEOJ,DEOJ,ESV,OPC,property,value\n`);
                echonet.initialize(['05ff01'], ofuroWatchCsvHandler);
            } else {
                writeLog(currentDateObj, `[ofuro] メッセージを待機中……　Ctrl-C で終了します`);
                echonet.initialize(['05ff01'], ofuroWatchMessageHandler);
            }
            await sleep(500);
        })();
    });

cli.command('').action(() => cli.outputHelp());
cli.help();
cli.version(packagejson.version);
cli.parse();

function echonetSend(deojArg, esvArg, propertyArg, valueArg) {
    let elDeoj = ['0x00', '0x00', '0x00'];
    //TODO: Sanitize
    elDeoj = [`0x${deojArg.substr(0, 2)}`, `0x${deojArg.substr(2, 2)}`, `0x${deojArg.substr(4, 2)}`];

    let elEsv = echonet.GET;
    switch (esvArg) {
        case 'SETI_SNA':
            elEsv = echonet.SETI_SNA;
            break;
        case 'SETC_SNA':
            elEsv = echonet.SETC_SNA;
            break;
        case 'GET_SNA':
            elEsv = echonet.GET_SNA;
            break;
        case 'INF_SNA':
            elEsv = echonet.INF_SNA;
            break;
        case 'SETGET_SNA':
            elEsv = echonet.SETGET_SNA;
            break;
        case 'SETI':
            elEsv = echonet.SETI;
            break;
        case 'SETC':
            elEsv = echonet.SETC;
            break;
        case 'GET':
            elEsv = echonet.GET;
            break;
        case 'INF_REQ':
            elEsv = echonet.INF_REQ;
            break;
        case 'SETGET':
            elEsv = echonet.SETGET;
            break;
        case 'SET_RES':
            elEsv = echonet.SET_RES;
            break;
        case 'GET_RES':
            elEsv = echonet.GET_RES;
            break;
        case 'INF':
            elEsv = echonet.INF;
            break;
        case 'INFC':
            elEsv = echonet.INFC;
            break;
        case 'INFC_RES':
            elEsv = echonet.INFC_RES;
            break;
        case 'SETGET_RES':
            elEsv = echonet.SETGET_RES;
            break;
        default:
            elEsv = echonet.GET;
    }

    let elProperty = 0x00;
    elProperty = parseInt(propertyArg);

    let elValue = 0x00;
    elValue = parseInt(valueArg);

    echonet.sendOPC1(config.ip, controllerObjectId, elDeoj, elEsv, elProperty, elValue);
}

function ofuroSet(item, value) {
    echonet.sendOPC1(config.ip, controllerObjectId, bathControllerObjectId, echonet.SETC, item, value);
}

async function ofuroGet(item) {
    echonet.sendOPC1(config.ip, controllerObjectId, bathControllerObjectId, echonet.GET, item);
    await sleep(50);
}

function ofuroStatusMessageHandler(rinfo, els, err) {
    if (err) {
        console.dir(err);
    } else {
        if (els['SEOJ'] == '027201') {
            let key = Object.keys(els.DETAILs).shift();
            let val = els.DETAILs[key];
            responseResultObj[key] = val;
        }
    }
}

function showStatus(obj) {
    const pwr = obj['80'] == '30' ? redON : cyanOFF;
    const showerBoilerStatus = obj['d0'] == '41' ? `${colors.red('燃焼中')}` : `${colors.cyan('停止中')}`;
    const showerTemperature = parseInt(obj['d1'], 16);
    const bathBoilerStatus = obj['e2'] == '41' ? `${colors.red('燃焼中')}` : `${colors.cyan('停止中')}`;
    const bathTemperature = parseInt(obj['e1'], 16);
    const autoModeStatus = obj['e3'] == '41' ? redON : cyanOFF;
    const reheatModeStatus = obj['e4'] == '41' ? redON : cyanOFF;
    const addHotWaterModeStatus = obj['e5'] == '41' ? redON : cyanOFF;
    const addColdWaterModeStatus = obj['e6'] == '41' ? redON : cyanOFF;
    const waterLevel = parseInt(obj['d4'], 16);
    const waterLevelMax = parseInt(obj['d5'], 16);
    const emgStatus = obj['88'] == '41' ? `${colors.red.bold('YES')}` : `${colors.green('平常')}`;

    const items = [
        ['項目名', '値'],
        ['システム電源', pwr],
        ['ステータス', emgStatus],
        ['給湯器燃焼状態', showerBoilerStatus],
        ['給湯温度', `${showerTemperature}℃`],
        ['給湯器燃焼状態（風呂）', bathBoilerStatus],
        ['給湯温度（風呂）', `${bathTemperature}℃`],
        ['ふろ自動モード', autoModeStatus],
        ['追いだきモード', reheatModeStatus],
        ['足し湯モード', addHotWaterModeStatus],
        ['ぬるめモード', addColdWaterModeStatus],
        ['設定湯量', `${waterLevel}/${waterLevelMax}`]
    ];
    console.log(listit.setHeaderRow(items.shift()).d(items).toString());
}

function ofuroWatchMessageHandler(rinfo, els, err) {
    const currentDateObj = new Date();
    if (err) {
        console.dir(err);
    } else {
        const matchedSEOJ = ofuroDB[els['SEOJ']];
        const matchedDEOJ = ofuroDB[els['DEOJ']];
        let seoj = els['SEOJ'];
        let deoj = els['DEOJ'];
        let esv = els['ESV'];
        let opc = els['OPC'];
        let seojName = '';
        let deojName = ''
        let valueName = '';
        let displayValue = '';
        const keys = Object.keys(els['DETAILs']);
        keys.forEach(key => {
            const elsDetailsValue = els['DETAILs'][key].toLowerCase();
            if (matchedSEOJ == undefined) {
                seojName = 'unknown';
                valueName = 'unknown';
                displayValue = `hex: ${elsDetailsValue}`;
            } else if (matchedSEOJ.values[key] == undefined) {
                seojName = matchedSEOJ['name'];
                valueName = 'unknown';
                displayValue = `hex: ${elsDetailsValue}`;
            } else {
                const type = matchedSEOJ.values[key].type;
                seojName = matchedSEOJ['name'];
                valueName = matchedSEOJ.values[key].name;

                if (type == 'list') {
                    displayValue = `${matchedSEOJ.values[key].values[elsDetailsValue]} (hex: ${elsDetailsValue})`
                } else if (type == 'hex') {
                    displayValue = `${parseInt(elsDetailsValue, 16)} (hex: ${elsDetailsValue})`
                } else if (type == 'raw') {
                    displayValue = `(hex: ${elsDetailsValue})`;
                }
            }

            if (matchedDEOJ == undefined) {
                deojName = 'unknown';
            } else {
                deojName = matchedDEOJ['name'];
            }
            writeLog(currentDateObj, `[${colors.yellow.bold(seojName)}(${seoj})->${colors.yellow.bold(deojName)}(${deoj})] ESV:${colors.green(esv)} OPC:${colors.blue(opc)} ${colors.yellow(valueName)}(${key}) : ${colors.yellow(displayValue)}`);
        });
    }
}

function ofuroWatchCsvHandler(rinfo, els, err) {
    const currentDateObj = new Date();
    const currentTimeStamp = currentDateObj.toISOString();
    if (!err) {
        let seoj = els['SEOJ'];
        let deoj = els['DEOJ'];
        let esv = els['ESV'];
        let opc = els['OPC'];
        const keys = Object.keys(els['DETAILs']);
        keys.forEach(key => {
            const elsDetailsValue = els['DETAILs'][key].toLowerCase();
            let csvLine = `${currentTimeStamp},${seoj},${deoj},${esv},${opc},${key},${elsDetailsValue}`
            console.log(csvLine);
            fs.appendFileSync(`${ofuroLaunchTimeStamp}.csv`, `${csvLine}\n`);
        });
    }
}

function writeLog(dateObj, arg) {
    const currentTimeStamp = dateObj.toISOString();
    console.log(`${currentTimeStamp} ${arg}`);
}

function sleep(interval) {
    return new Promise((resolve) => {
        setTimeout(() => { resolve() }, interval);
    });
} 