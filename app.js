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
const version = require('./package.json').version;

let port;
let configName;

//============ 命令行开发start ============
console.log("\nversion: " + version)
commander.version(version);

commander
  .option('-p, --port <number>', "set port", 6688)
  .option('-c, --config <fileName>', "set profile name", "xcrud-generator.js");

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
	config = require(configPath);
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

// 如果cache模式是db模式
function createCacheTable() {
	if(config.cache === 'db') {
		let createTableSql = `
		CREATE TABLE IF NOT EXISTS xcrud_generator_cache (
			id int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
			  table_name varchar(64) DEFAULT NULL COMMENT '表名',
			cache_json text NOT NULL COMMENT '缓存的数据',
			create_by varchar(32) DEFAULT NULL COMMENT '创建人',
			create_time datetime DEFAULT NULL COMMENT '创建时间',
			PRIMARY KEY (id) USING BTREE,
			KEY table_name (table_name)
		  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=DYNAMIC COMMENT='xcrud_generator 缓存表';
		`
		db.query(createTableSql, (error, results, fields) => {
			if (error) console.log(error);
		})
	}
}

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
			let createTime = ''
			if(table.Create_time) {
				createTime = table.Create_time.toISOString().replace(/\..+$/, '')
				createTime = createTime.replace(/T/, ' ')
			}
			arr.push({
				name: table.Name,
				collation: table.Collation,
				comment: table.Comment,
				createTime: createTime
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
    let { model, config } = req.body;
    model.StrUtil = StrUtil;
	render(model, config, () => res.send("ok"));
});

//缓存历史配置
app.post("/cache", function(req, res) {
	let cache = req.body
	db.query(`INSERT INTO xcrud_generator_cache (table_name, cache_json, create_by, create_time) VALUES ('${cache.tableName}', '${cache.cacheJson}', '${config.user}', '${formateDateToString(new Date())}')`, (error, results, fields) => {
		if (error) throw error;
		res.send("ok")
	})
});

//获取历史配置
app.get("/cache", function(req, res) {
	let tableName = req.query.tableName
    db.query(`SELECT * FROM xcrud_generator_cache WHERE table_name = '${tableName}'`, (error, results, fields) => {
		if (error) throw error;
		res.send(results)
	})
});

//删除历史配置
app.delete("/cache", function(req, res) {
	let id = req.query.id
    db.query(`DELETE FROM xcrud_generator_cache WHERE id = ${id}`, (error, results, fields) => {
		if (error) throw error;
		res.send(results)
	})
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
		createCacheTable()
	}
});


// 渲染输出文件
function render(model, config, callback) {
	let templatePath = path.resolve(process.cwd(), config.input.dir);
	let outputFileList = config.output.map(item => item.template)
	glob(templatePath + "/**/*.ejs", (err, files) => {
		if(err) console.log(err);
		files.forEach(file => {
			if( outputFileList.includes(path.basename(file)) ) {
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
			}
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

function formateDateToString(date) {
	let Y = date.getFullYear() + '-';
	let M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
	let D = date.getDate() + ' ';
	let h = date.getHours() + ':';
	let m = date.getMinutes() + ':';
	let s = date.getSeconds();
	return Y+M+D+h+m+s
}