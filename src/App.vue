<template>
	<div id="app" v-loading="loading" style="width: 1000px;margin: auto;">
		<h1 style="font-size: 26px;">xcrud 代码生成器</h1>
		<div style="margin: 20px 0">
			<el-input placeholder="请输入内容" v-model="searchTableName">
				<template slot="prepend">通过表名搜索</template>
			</el-input>
		</div>
		<el-table border :data="computedTableNames" style="width: 100%">
			<el-table-column type="index" align="center"></el-table-column>
			<el-table-column prop="name" label="表名" align="center" show-overflow-tooltip></el-table-column>
			<el-table-column prop="collation" label="字符编码集" align="center" show-overflow-tooltip></el-table-column>
			<el-table-column prop="createTime" label="创建时间" align="center" show-overflow-tooltip></el-table-column>
			<el-table-column prop="comment" label="备注" align="center" show-overflow-tooltip></el-table-column>
			<el-table-column label="操作" align="center" width='140px'>
				<template slot-scope="scope">
					<el-button  type="success" plain @click="openDialog(scope.$index, scope.row)">生成代码</el-button>
				</template>
			</el-table-column>
    	</el-table>
		<!-- 🌱  -->
		<el-drawer :title="`📣 生成代码 (${tableName})`" :visible.sync="dialogVisible" size="100%" direction="ttb" @close="handleClose" :wrapperClosable="false" :close-on-press-escape="false">
			<div style="height: calc(100vh - 77px);">
				<div v-show="!isMonacoShow">
					<el-divider>🎉 生成模板 🎉</el-divider>
					<div class="scroll">
						<el-checkbox-group v-model="checkFileList" style="padding: 0 10px" size="medium">
							<el-checkbox style="margin-right: 10px" :label="output.template" border v-for="(output, index) in config.output" :key="index">{{ output.template }}</el-checkbox>
						</el-checkbox-group>
					</div>
					<el-divider>🚀 混入变量 🚀</el-divider>
					<div class="scroll" v-if="this.config && this.config.mixin">
						<div style="display: inline-block;">
							<el-input v-model="config.mixin[key]" class="mixin-input" width="300" v-for="(value,key) in this.config.mixin" :key="key" >
								<template slot="prepend">{{ key }}</template>
							</el-input>
						</div>
					</div>
					<el-divider>✨ 数据库字段 ✨</el-divider>
					<el-table height="calc(100vh - 400px)" border :data="fieldList" style="width: 100%">
						<el-table-column type="index" align="center"></el-table-column>
						<el-table-column prop="field" label="字段名" align="center"></el-table-column>
						<el-table-column prop="type" label="字段类型" align="center"></el-table-column>
						<el-table-column prop="comment" label="备注" align="center">
							<template slot-scope="scope">
								<el-input v-model="scope.row.comment"></el-input>
							</template>
						</el-table-column>
						<template v-for="(field,index) in config.fields">
							<el-table-column :prop="field.name" :label="field.title" :key="index" align="center" :width="field.width">
								<template slot-scope="scope">
									<el-select v-if="field.type == 'select'" v-model="scope.row[field.name]" :placeholder="field.placeholder">
										<el-option
											v-for="(item,optionIndex) in field.options"
											:key="optionIndex"
											:label="item.label"
											:value="item.value">
										</el-option>
									</el-select>
									<el-input v-else-if="field.type == 'input'" v-model="scope.row[field.name]" :placeholder="field.placeholder"></el-input>
									<el-checkbox v-else-if="field.type == 'checkbox'" v-model="scope.row[field.name]"></el-checkbox>
								</template>
							</el-table-column>
						</template>
					</el-table>
				</div>
				<div ref="monaco" class="monacoClass" v-show="isMonacoShow"></div>
				<el-drawer title="历史记录" :append-to-body="true" :visible.sync="historyDrawer" size="800px">
					<el-table :data="historyList" stripe :default-sort = "{prop: 'createTime', order: 'descending'}">
						<el-table-column prop="dbName" label="数据库" align="center" show-overflow-tooltip></el-table-column>
						<el-table-column prop="tableName" label="表名" align="center" show-overflow-tooltip></el-table-column>
						<el-table-column prop="createTime" label="日期" align="center" show-overflow-tooltip></el-table-column>
						<el-table-column prop="createBy" label="创建人" align="center" show-overflow-tooltip></el-table-column>
						<el-table-column label="操作" align="center">
							<template slot-scope="scope">
								<el-button size="mini" type="success" plain @click="loadFromHistory(scope.row.cacheJson)">载入</el-button>
								<el-button size="mini" type="danger" plain @click="deleteHistory(scope.row.id)">删除</el-button>
							</template>
						</el-table-column>
					</el-table>
				</el-drawer>
				<div style="text-align: end;margin: 20px 40px;">
					<el-button @click="showHistory" v-if="!isMonacoShow">载入历史</el-button>
					<el-button @click="isMonacoShow = !isMonacoShow">{{ isMonacoShow ? '取消预览' : '预览Model' }}</el-button>
					<el-button type="primary" @click="generate">确 定</el-button>
				</div>
			</div>
		</el-drawer>
	</div>
</template>

<script>
import axios from "axios"
import { Message } from 'element-ui';
import * as monaco from 'monaco-editor';

axios.defaults.baseURL = process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:6688';
axios.interceptors.response.use(function (response) {
	// Any status code that lie within the range of 2xx cause this function to trigger
	// Do something with response data
	return response;
}, function (error) {
	// Any status codes that falls outside the range of 2xx cause this function to trigger
	// Do something with response error
	Message.info("服务器错误")
	return Promise.reject(error);
});

export default {
	name: "app",
	data() {
		return {
			projectName: "xcrud-generator",
			rawConfig: {},	// 用户的配置文件
			config: {},	// 用户修改后的配置文件
			checkFileList: [],	// 用户的配置文件
			tableNames: [],	// 表名
			searchTableName: '',	// 用户搜索的表名
			loading: 0,
			tableName: '',
			dialogVisible: false,
			isMonacoShow: false,
			fieldList: [],	// 某张表的字段列表
			editor: "",
			historyList: [],
			historyDrawer: false,
		}
	},
	mounted() {
		this.getTableName();
		this.getConfig();
	},
	methods: {
		getConfig() {
			this.loading++;
			axios.get('/config').then(res => {
				this.rawConfig = res.data;
			}).catch(e => console.log(e)).finally(() => this.loading--);
		},
		getTableName() {
			this.loading++;
			axios.get('/table/list').then(res => {
				this.tableNames = res.data;
			}).catch(e => console.log(e)).finally(() => this.loading--);
		},
		openDialog(index, row) {
			this.loading++;
			this.config = JSON.parse(JSON.stringify(this.rawConfig));
			this.checkFileList = this.config.output.map(item => item.template)
			this.tableName = row.name;
			axios.get('/table/fields/info?name='+this.tableName).then(res => {
				res.data.forEach(item => {
					if(this.config.fields) {
						this.config.fields.forEach(f => item[f.name] = f.default)
					}
				})
				this.fieldList = res.data;
				this.dialogVisible = true;
			}).catch(e => console.log(e)).finally(() => this.loading--);
		},
		showHistory() {
			if(this.config.cache === 'db') {
				this.loading++;
				axios.get(`/cache?tableName=${this.tableName}`).then(res => {
					this.historyList = res.data.map(item => {
						return {
							id: item.id,
							dbName: this.config.db.database,
							tableName: item.table_name,
							cacheJson: item.cache_json,
							createTime: item.create_time.replace('T', ' ').replace(/\..+/, ''),
							createBy: item.create_by
						}
					});
				}).catch(e => console.log(e)).finally(() => this.loading--);
			} else {
				this.historyList = Object.keys(localStorage).filter(item => item.indexOf(this.projectName) === 0 && item.indexOf(this.config.db.database) !== -1 && item.indexOf(this.tableName) !== -1);
				this.historyList = this.historyList.map(item => {
					let temp = item.split(".")
					return {
						id: item,
						dbName: temp[1],
						tableName: temp[2],
						createTime: temp[3],
						cacheJson: localStorage[item],
						createBy: 'browser'
					}
				})
			}
			this.historyDrawer = true;
		},
		loadFromHistory(cacheJson) {
			let history = JSON.parse(cacheJson)
			this.fieldList = history.fieldList
			this.config = history.config
			this.historyDrawer = false
			this.$message({ message: '载入成功', type: 'success' });
		},
		deleteHistory(id) {
			if(this.config.cache === 'db') {
				axios.delete('cache?id=' + id).then(res => {
					this.$message({ message: '删除成功', type: 'success' })
					this.showHistory()
				}).catch(e => this.$message({ message: '删除失败', type: 'error' }))
			} else {
				delete localStorage[id]
				this.showHistory()
			}
		},
		generate(index, row) {
			this.loading++;
			let model = this.getModel();
			let config = JSON.parse(JSON.stringify(this.config))
			config.output = this.checkFileList.map(item => {
				let r;
				this.rawConfig.output.forEach(raw => {
					if(raw.template == item) {
						r = raw
					}
				})
				return r;
			})
			axios.post('generate', { config, model }).then(res => {
				// localStorage 示例 "xcrud-generator.dbName.tableName.createTime = json"

				this.saveCache();
				this.$message({ message: '生成成功', type: 'success' });
				this.dialogVisible = false;
			}).catch(e => console.log(e)).finally(() => this.loading--);
		},
		saveCache() {
			let cacheJson = JSON.stringify({ config: this.config, fieldList: this.fieldList })
			if(this.config.cache === 'db') {
				let param = {
					tableName: this.tableName,
					cacheJson: cacheJson
				}
				axios.post('cache', param).catch(e => this.$message({ message: '缓存配置失败', type: 'error' }))
			} else {
				function fillZero(num) {
					return (num > 9) ? num : '0' + num;
				}
				let now = new Date();
				let month = fillZero(now.getMonth() + 1)
				let date = fillZero(now.getDate())
				let hour = fillZero(now.getHours())
				let minutes = fillZero(now.getMinutes())
				let seconds = fillZero(now.getSeconds())
				let nowStr = `${now.getFullYear()}-${month}-${date} ${hour}:${minutes}:${seconds}`
				localStorage[`${this.projectName}.${this.config.db.database}.${this.tableName}.${nowStr}`] = cacheJson
			}
		},
		getModel() {
			let model = Object.assign({}, this.config.mixin);
			model.tableName = this.strTransfer(this.tableName);
			model.TableName = model.tableName.replace(/^\w/, a => a.toUpperCase());
			model.fields = JSON.parse(JSON.stringify(this.fieldList));
			return model;
		},
		handleClose() {
			this.isMonacoShow = false;
			this.tableName = '';
			this.fieldList = [];
		},
		// 下划线转换为驼峰，全部大写则转换为小写
		strTransfer(str) {
			if(!str) return str;
			//全部大写
			if(!/[a-z]+/g.test(str)) {
				str = str.toLowerCase();
			}
			//下划线转驼峰
			str = str.replace(/\_(\w)/g, function(all, letter){
				return letter.toUpperCase();
			});
			// 首字母小写
			str = str.replace(/^(\w)/g, function(all, letter){
				return letter.toLowerCase();
			});
			return str;
		}
	},
	computed: {
		computedTableNames() {
			return this.tableNames.filter(item => {
				return item.name.indexOf(this.searchTableName) !== -1;
			})
		}
	},
	watch: {
		isMonacoShow(newVal, oldVal) {
			if(newVal) {
				let model = this.getModel();
				this.editor = monaco.editor.create(this.$refs['monaco'], {
					value: '',
					language: 'json',
					theme: 'vs-dark',
					automaticLayout: true,
					autoIndent: true,
					autoClosingBrackets: true,
					acceptSuggestionOnEnter: 'on',
					colorDecorators: true,
					dragAndDrop: true,
					formatOnPaste: true,
					formatOnType: true,
					mouseWheelZoom: true,
					readOnly: true,
					scrollbar:{
						verticalScrollbarSize: 5
					}
				});
				this.editor.setValue(JSON.stringify(model,null,"\t"))
			} else {
				this.editor.dispose();
			}
		}
	}
};
</script>

<style>
/* #app {
	font-family: "Avenir", Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	margin-top: 60px;
} */

.mixin-input {
	width: 240px;
	margin-left: 20px;
}

.scroll {
	text-align: center;
	white-space: nowrap;
	overflow-x: scroll;
	overflow-y: hidden;
}
/* 最为关键得两个样式代码，可以设置全局滚动条样式，也可以按需设置 */
::-webkit-scrollbar {
	/* 设置竖向滚动条的宽度 */
	width: 7px;
	/* 设置横向滚动条的高度 */
	height: 7px;
}
::-webkit-scrollbar-thumb {
	/*滚动条的背景色*/
	background-color: #c7c9cc;
	border-radius: 35px;
	position: relative;
}
.el-input-group__append, .el-input-group__prepend {
	padding: 0 14px;
}

.monacoClass {
	height: calc(100vh - 158px);
}
</style>
