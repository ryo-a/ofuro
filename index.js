#! /usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const echonet = require('echonet-lite');
const cli = require('cac')();
const colors = require('colors');

const packagejson = require('./package.json');
const configPath = path.join(os.homedir(), '.ofuro.config.json');

const ListIt = require("list-it");
const listit = new ListIt({
    headerBold: true,
    headerUnderline: true,
});

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
const controllerObjectId = ['05ff01']; //コントローラ
const bathControllerObjectId = [0x02, 0x72, 0x01]; //給湯器
const responseResultObj = {};

cli
    .command('on', 'ガス給湯器をONにします。')
    .action(() => {
        ofuroSet(0x80, 0x30);
    });

cli
    .command('off', 'ガス給湯器をOFFにします。')
    .action(() => {
        ofuroSet(0x80, 0x31);
    });

cli
    .command('auto', 'ふろ自動モード（湯沸かし）を開始します。')
    .action(() => {
        ofuroSet(0xE3, 0x41);
    });

cli
    .command('auto-stop', 'ふろ自動モード（湯沸かし）を解除・中止します。')
    .action(() => {
        ofuroSet(0xE3, 0x42);
    });

cli
    .command('reheat', '追いだきモードを開始します。')
    .action(() => {
        ofuroSet(0xE4, 0x41);
    });

cli
    .command('reheat-stop', '追いだきモードを解除・中止します。')
    .action(() => {
        ofuroSet(0xE4, 0x42);
    });

cli
    .command('status', '設定温度など現在の状態を表示します。')
    .action(() => {
        (async function () {
            process.stdout.write('給湯リモコンの設定値を取得中……');
            echonet.initialize(['05ff01'], ofuroMessageHandler);
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

cli.command('').action(() => cli.outputHelp());
cli.help();
cli.version(packagejson.version);
cli.parse();

function ofuroSet(item, value) {
    echonet.sendOPC1(config.ip, controllerObjectId, bathControllerObjectId, echonet.SETC, item, value);
}

async function ofuroGet(item) {
    echonet.sendOPC1(config.ip, controllerObjectId, bathControllerObjectId, echonet.GET, item);
    await sleep(50);
}

function ofuroMessageHandler(rinfo, els, err) {
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
    const redON = `${colors.red('ON')}`;
    const cyanOFF = `${colors.cyan('OFF')}`;

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

function sleep(interval) {
    return new Promise((resolve) => {
        setTimeout(() => { resolve() }, interval);
    });
} 