// JSONファイルの読み込み（ローカル用）/////////////////////////////////
var fs = require('fs');
var setting = {};

var IFTTT_SECURITY_KEY = "";
var MILKCOCOA_APP_ID = "";
var IFTTT_RECEIVE_DATASTORE_ID = "";
var IFTTT_RECEIVE_URL = "";
var IFTTT_SEND_DATASTORE_ID = "";
var IFTTT_SEND_EVENT_NAME = "";
var IFTTT_SEND_URL = "";

if( process.env.PORT ) {
    // Heroku上では環境変数から読み込む（インストール時に設定）
    IFTTT_SECURITY_KEY = process.env.IFTTT_SECURITY_KEY;
    MILKCOCOA_APP_ID = process.env.MILKCOCOA_APP_ID;
    IFTTT_RECEIVE_DATASTORE_ID = process.env.IFTTT_RECEIVE_DATASTORE_ID;
    IFTTT_RECEIVE_URL = process.env.IFTTT_RECEIVE_URL;
    IFTTT_SEND_DATASTORE_ID = process.env.IFTTT_SEND_DATASTORE_ID;
    IFTTT_SEND_EVENT_NAME = process.env.IFTTT_SEND_EVENT_NAME;
    IFTTT_SEND_URL = process.env.IFTTT_SEND_URL;
} else {
    // .envフォルダはあらかじめ .gitignore 対象にしておく。
    setting = JSON.parse(fs.readFileSync('.env/setting.json', 'utf8'));
    //
    IFTTT_SECURITY_KEY = setting.IFTTT_SECURITY_KEY;
    MILKCOCOA_APP_ID = setting.MILKCOCOA_APP_ID;
    IFTTT_RECEIVE_DATASTORE_ID = setting.IFTTT_RECEIVE_DATASTORE_ID;
    IFTTT_RECEIVE_URL = setting.IFTTT_RECEIVE_URL;
    IFTTT_SEND_DATASTORE_ID = setting.IFTTT_SEND_DATASTORE_ID;
    IFTTT_SEND_EVENT_NAME = setting.IFTTT_SEND_EVENT_NAME;
    IFTTT_SEND_URL = setting.IFTTT_SEND_URL;
}

console.log("IFTTT_RECEIVE_DATASTORE_ID : " + IFTTT_SECURITY_KEY);
console.log("IFTTT_RECEIVE_URL : " + IFTTT_RECEIVE_URL);
console.log("IFTTT_SEND_DATASTORE_ID : " + IFTTT_SEND_DATASTORE_ID);
console.log("IFTTT_SEND_EVENT_NAME : " + IFTTT_SEND_EVENT_NAME);
console.log("IFTTT_SEND_URL : " + IFTTT_SEND_URL);

// milkcocoa /////////////////////////////////
var MilkCocoa = require("./node_modules/milkcocoa/index.js");
var milkcocoa = new MilkCocoa(MILKCOCOA_APP_ID + ".mlkcca.com");
// dataStore作成 デフォルトのデータストアIDは IFTTTData にしています。
var receiveDataStore = milkcocoa.dataStore(IFTTT_RECEIVE_DATASTORE_ID);
// データがpushされたときのイベント通知
receiveDataStore.on("push", function(datum) {
    // 内部のログ
    console.log('[receiveDataStore push complete]');
    console.log(datum);
});
// Milkcocoa → IFTTT Milkcocoaアクセス版
var sendDataStore = milkcocoa.dataStore(IFTTT_SEND_DATASTORE_ID);
sendDataStore.on("push", function(datum) {
    // 内部のログ
    console.log('[sendDataStore push complete]');
    console.log(datum);
    // IFTTTに送る関数
    sendIFTTT(datum.value);
});
//////////////////////////////////////////////

var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var app = express();
var http = require('http').Server(app);

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', function(request, response) {
    response.send('Hello Milkcocoa & IFTTT!');
});

// IFTTTから送信されてきたデータをMilkcocoaに通知する
// IFTTT→Milkcocoa
app.post(IFTTT_RECEIVE_URL, function(request, response) {
    response.set('Content-Type', 'application/json');
    console.log('---------- input[/ifttt/receive]');
    console.log(request.body);
    response.send("{'request':'/ifttt/receive'}");
    var valueweather = request.body.values[0];
    receiveDataStore.push(valueweather);
});

// Milkcocoaが受信されたデータをIFTTTに通知する HTTPアクセス版
// Milkcocoa→IFTTT
app.post(IFTTT_SEND_URL, function(request, response) {
    response.set('Content-Type', 'application/json');
    console.log('---------- input[/ifttt/send]');
    console.log(request.body);
    response.send("{'request':'/ifttt/send'}");
    // IFTTTに送る関数
    sendIFTTT(request.body);
});

http.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

// 実際の送信する sendIFTTT
function sendIFTTT(values){
    //
    // IFTTTに送るデータ用意
    var _data = {
        value1:"",
        value2:"",
        value3:""
    };
    // 最低限のデータチェック
    if( values.hasOwnProperty("value1") ){
        _data.value1 = values.value1;
    }
    if( values.hasOwnProperty("value2") ){
        _data.value2 = values.value2;
    }
    if( values.hasOwnProperty("value3") ){
        _data.value3 = values.value3;
    }
    // IFTTTに送る処理
    var _request = require('request');
    var options = {
        uri: 'http://maker.ifttt.com/trigger/' + IFTTT_SEND_EVENT_NAME + '/with/key/' + IFTTT_SECURITY_KEY,
        form: {
            value1:_data.value1,
            value2:_data.value2,
            value3:_data.value3
        },
        json: true
    };
    console.log('---------- [' + IFTTT_SEND_EVENT_NAME + ']');
    console.log(options);
    _request.post(options, function(error, response, body){
        if (!error && response.statusCode == 200) {
            console.log(body);
        } else {
            console.log('error: '+ response.statusCode);
        }
    });

}
