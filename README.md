# ofuro

ofuro（おふろ）は ECHONET Lite プロトコルを用いて給湯器を制御するコマンドラインツールのデモ実装です。

仕様上は ECHONET Lite に対応した給湯リモコンにはすべて対応しているはずですが、作者はノーリツ製 **RC-G001MW-2** で動作を確認しています。

**動作する様子の動画はこちら: https://www.youtube.com/watch?v=NnpHsreI_QE**

解説記事はこちら: https://zenn.dev/ryo_a/articles/c9f515309d6f0b

## 注意事項

本ツールはECHONET Liteプロトコルの理解およびPoCを目的としたもので、IoT家電操作ツールとして常用することは想定していません。

本ソフトウェアを用い、適切に設定を行うことにより、実際に給湯器にコマンドを送信することができます。リモコン側がHEMS用に備えている標準の機能を用いて操作を行うものであり、安全であると考えられますが、それでもガス機器をLAN内から操作することに変わりありません。

実際にこのツールや派生ツールを用いて実験を行う場合、すべて自己責任で行ってください。予期せぬ動作に対応できない場合、利用を避けることを強く推奨します。ライセンス（MITライセンス）の通り、このソフトウェアに起因して何らかの損害が発生したとしても、作者は一切の責任を負わないものとします。

## インストール

```
$ npm install -g ofuro
```

## 給湯リモコン側の設定

説明書を参考に、以下の操作を実施する必要があります。

- 無線LANに接続する
- 「エコーネットライト」を有効にする

また、設定で使用するため、IPアドレスを控えておいてください。台所側リモコンの`メニュー`＞`音・その他`＞`無線LAN`＞`設定情報`＞`リモコンアドレス`の順で確認できます。

**HEMSを使用していない場合、想定しない誤動作を防ぐため、実験が終わったら「エコーネットライト」をオフにすることをおすすめします。**

## 初期設定

ホームディレクトリ直下に `~/.ofuro.config.json` という設定ファイルを作成します。
設定ファイルがない状態でこのツールを起動すると、ダミーのファイルを作成しますので、IPアドレスを差し替えてください。

```
$ ofuro
$ code ~/.ofuro.config.json
```

## コマンド

以下の機能を備えています。コマンドラインオプションはありません。

### システムのオン・オフ

リモコンのON/OFFボタンの操作に相当するものです。

```
$ ofuro on
```

```
$ ofuro off
```

### ふろ自動

ふろ自動モードのボタン操作に相当するものです。`auto`で開始、`auto-stop`で中断できます。

```
$ ofuro auto
```

```
$ ofuro auto-stop
```

### 追いだき

追いだきモードのボタン操作に相当するものです。`reheat`で開始、`reheat-stop`で中断できます。

```
$ ofuro reheat
```

```
$ ofuro reheat-stop
```

### ステータス確認

現在のステータスを確認できます。

```
$ ofuro status

♨ ofuro ♨
項目名                 値    
---------------------- ------
システム               OFF   
異常発生               平常  
給湯器燃焼状態         停止中
給湯温度               40℃  
給湯器燃焼状態（風呂） 停止中
給湯温度（風呂）       41℃  
ふろ自動モード         OFF   
追いだきモード         OFF   
足し湯モード           OFF   
ぬるめモード           OFF   
風呂湯量               5/11 
```

### ブロードキャストされるメッセージの受信・表示

```
$ ofuro watch 

♨ ofuro ♨
2023-01-06T14:48:22.682Z [ofuro] メッセージを待機中……　Ctrl-C で終了します
2023-01-06T14:49:20.499Z [風呂沸き上がりセンサ(001601)->コントロールパネル(05ff01)] ESV:72 OPC:01 動作状態(80) : OFF (hex: 31)
2023-01-06T14:53:04.283Z [風呂沸き上がりセンサ(001601)->コントロールパネル(05ff01)] ESV:72 OPC:01 動作状態(80) : OFF (hex: 31)
2023-01-06T15:51:04.688Z [瞬間式給湯器(027201)->ノードプロファイル(0ef001)] ESV:73 OPC:01 unknown(f4) : hex: 303200000000000c00ff0000000b
2023-01-06T16:20:52.746Z [風呂沸き上がりセンサ(001601)->コントロールパネル(05ff01)] ESV:72 OPC:01 動作状態(80) : OFF (hex: 31)
2023-01-06T16:21:07.708Z [風呂沸き上がりセンサ(001601)->コントロールパネル(05ff01)] ESV:52 OPC:01 unknown(00) : hex: 
2023-01-06T16:29:52.327Z [風呂沸き上がりセンサ(001601)->unknown(000000)] ESV:72 OPC:01 動作状態(80) : OFF (hex: 31)
2023-01-06T16:32:37.288Z [風呂沸き上がりセンサ(001601)->unknown(000000)] ESV:72 OPC:01 動作状態(80) : OFF (hex: 31)
2023-01-06T16:32:53.699Z [風呂沸き上がりセンサ(001601)->unknown(000000)] ESV:72 OPC:01 動作状態(80) : OFF (hex: 31)
2023-01-06T16:33:46.403Z [瞬間式給湯器(027201)->コントロールパネル(05ff01)] ESV:72 OPC:01 動作状態(80) : OFF (hex: 31)
2023-01-06T16:34:07.379Z [瞬間式給湯器(027201)->コントロールパネル(05ff01)] ESV:72 OPC:01 動作状態(80) : OFF (hex: 31)
2023-01-06T16:34:19.072Z [瞬間式給湯器(027201)->コントロールパネル(05ff01)] ESV:71 OPC:01 動作状態(80) : undefined (hex: )
2023-01-06T16:34:19.374Z [瞬間式給湯器(027201)->ノードプロファイル(0ef001)] ESV:73 OPC:01 動作状態(80) : ON (hex: 30)
```

### 手動での ECHONET Lite パケット送信

手動でのパケット送信にも対応しています。

`$ ofuro send-el 対象オブジェクトのDEOJ ESV プロパティ 値`

```
$ ofuro send-el 027201 SETI 0x80 0x31
♨ ofuro ♨
```