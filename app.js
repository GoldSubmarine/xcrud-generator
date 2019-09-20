#!/usr/bin/env node
const mysql = require("mysql");
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const bodyParser = require('body-parser')
const glob = require("glob")
const ejs = require('ejs');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const commander = require('commander');
const StrUtil = require('./StrUtil');

let port;
let configName;

//============ 命令行开发start ============

commander.version('0.1.0');

commander
  .option('-p, --port <number>', "set port", 6688)
  .option('-c, --config <fileName>', "set profile name", "xcrud.json");

commander.parse(process.argv);

if (commander.port) port = commander.port;
if (commander.config) configName = commander.config;

//============= 命令行开发end ===========

let chalkError = chalk.black.bgRed("\n Error ");
let chalkSuccess = chalk.black.bgGreen("\n DONE ");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// 读取配置
let config;
let configPath = path.resolve(`${process.cwd()}/${configName}`);
if(fs.existsSync(configPath)) {
	config = fs.readFileSync(configPath).toString();
	config = JSON.parse(config);
} else {
	console.log(chalkError, `can not find the file '${configName}' in current directory\n`);
	process.exit();
}

let db = mysql.createConnection({
	host: config.db.host,
	port: config.db.port,
	user: config.db.user,
	password: config.db.password,
	database: config.db.database,
});

//跨域
app.all("*", function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild"
  );
  res.header("Access-Control-Allow-Methods", "PUT, POST, GET, DELETE, OPTIONS");

  if (req.method == "OPTIONS") {
	res.send("ok");
  } else {
    next();
  }
});

app.use(express.static(__dirname + "/dist"));

//获取所有的表名
app.get("/table/list", function(req, res) {
  db.query("show table status", function(error, results, fields) {
    if (error) throw error;
    let arr = [];
    results.forEach(table => {
	  arr.push({
		  name: table.Name,
		  comment: table.Comment,
		  createTime: table.Create_time
	  });
    });
    res.send(arr);
  });
});

//根据表名获取字段信息
app.get("/table/fields/info", function(req, res) {
  db.query(`show full columns from ${req.query.name}`, function(error, results, fields) {
	if (error) throw error;
	results.forEach(item => {
		item.Type = item.Type.replace(/\(.+\)/, '');
	})
	results = results.map(r => {
		let fieldInfo = {};
		for(let key in r) {
			fieldInfo[strTransfer(key)] = strTransfer(r[key]);
		}
		return fieldInfo;
	})
    res.send(results);
  });
});

//根据表名获取字段信息
app.get("/config", function(req, res) {
	res.send(config);
});

//根据model生成文件
app.post("/generate", function(req, res) {
    let model = req.body;
    model.StrUtil = StrUtil;
	render(model, () => res.send("ok"));
});

// 数据库建立连接，服务启动
db.connect(err => {
	if(err) {
		console.log(chalkError, "database connected failed!!\n");
		process.exit();
	} else {
		console.log(chalkSuccess, "database connected successfully!!");
		let server = app.listen(port, () => {
			console.log(chalkSuccess, "server start successfully");
			console.log("\n  App running at:", chalk.cyanBright(`http://localhost:${port}\n`))
		});
		server.on('error', (e) => {
			if (e.code === 'EADDRINUSE') {
				console.log(chalkError, "port is in used!!\n");
				process.exit();
			}
		});
	}
});


// 渲染输出文件
function render(model, callback) {
	let templatePath = path.resolve(process.cwd(), config.input.dir);
	glob(templatePath + "/**/*.ejs", (err, files) => {
		if(err) console.log(err);
		files.forEach(file => {
			let str = fs.readFileSync(file).toString();
			let renderedStr = ejs.render(str, model);
			let outputPath = findOutputPath(file, model);
			if(fs.existsSync(outputPath)) {
				console.log(chalk.yellowBright.bold("  exist  "), outputPath + "\n");
			} else if (outputPath) {
				let pp = path.dirname(outputPath).split(path.sep).join('/');
				mkdirp.sync(pp, err => console.error(err));
				fs.writeFileSync(outputPath, renderedStr);
				console.log(chalk.greenBright.bold("  created"), outputPath + "\n");
			};
		})
		console.log("  ======================" + "\n")
        callback();
	})
}

// 找到输出位置
function findOutputPath(file, model) {
	let result = '';
	config.output.forEach(o => {
		if (file.includes(o.template)) result = o.path;
	})
	result = ejs.render(result, model);
	if(result) {
		return path.resolve(process.cwd(), result)
	} else {
		return result;
	}
}

// 下划线转换为驼峰，全部大写则转换为小写
function strTransfer(str) {
	if(!str || typeof str !== "string") return str;
	//全部小写
	str = StrUtil.toLowerCase(str);

	//下划线转驼峰
	str = StrUtil.underscoreToCamel(str);
	
	// 首字母小写
	str = StrUtil.initialLowerCase(str);

	return str;
}