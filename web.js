const https = require('https');
const http = require('http');
const fs=require('fs');
const SynologyAccessory = require('./res/synologymodule');
const express = require('express');                                                 
const bodyParser = require('body-parser');

//load config.json
var account="./res/config.json";
var cfg=JSON.parse(fs.readFileSync( account));
var isHttps=cfg.secure;



//load SSL keys
if(isHttps)
	var options = { 
		key:fs.readFileSync('./ssl/privkey.pem'),
		cert:fs.readFileSync('./ssl/cert.pem'),

		requestCert:true,

		rejectUnauthorized:false 
	}; 

//middleware service
const app = express();
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(express.static('public'));



//---------------------------add ur code here-----------------------------------------
//service
var nas =new SynologyAccessory(console.log,cfg);
setTimeout(function(){nas.nasinfo();},5000);
//web service
app.post('/synology/getInfo', function(req, res) {
	console.log(req.body.token);
	if(req.body.token==mytoken){
		nas.nasinfo();
		var response={"result":"true","power":nas.state,"drive":nas.disk,"cpuload":nas.cpu,"temp":nas.temp};}
	else var response={ "result":"false","msg":"permission defined"}
    res.json(response);
});

app.post('/synology/powerActivity', function (req, res) {
	console.log("incoming request from token:"+req.query.token);
	if(req.body.token==mytoken){
		nas.setPowerState(nas.state,function(){},'');
		var response = {"result":"true" };
	}
	else var response={ "result":"false","msg":"permission defined"};
    res.json(response);
});






//---------------------------add ur code here-----------------------------------------
//undefined request 
app.use((req, res, next) => {
    res.write('undefined request');
    res.end();
});
if(isHttps)
	var server = https.createServer(options,app)
else var server = http.createServer(app)

server.listen(cfg.server_port);
console.log(`Server listening at http(s)://youdomain:${cfg.server_port}`);


