<template>
	<div id="app" v-loading="loading">
		<el-table :data="tableNames" style="width: 100%">
			<el-table-column type="index"></el-table-column>
			<el-table-column prop="name" label="表名"></el-table-column>
			<el-table-column prop="createTime" label="创建时间"></el-table-column>
			<el-table-column prop="comment" label="备注"></el-table-column>
			<el-table-column label="操作">
				<template slot-scope="scope">
					<el-button  type="success" @click="openDialog(scope.$index, scope.row)">生成代码</el-button>
				</template>
			</el-table-column>
    	</el-table>
		<el-dialog title="生成代码" :visible.sync="dialogVisible" width="80%" @close="handleClose" :close-on-click-modal="false" :close-on-press-escape="false">
            <div v-if="!isMonacoShow">
                <el-row :gutter="20" v-if="this.config && this.config.mixin">
                    <el-col :span="6" v-for="(value,key) in this.config.mixin" :key="key" style="margin-bottom: 14px;">
                        <el-input v-model="config.mixin[key]"> -->
                            <template slot="prepend">{{ key }}</template>
                        </el-input>
                    </el-col>
                </el-row>
                <el-table :data="fieldList" style="width: 100%">
                    <el-table-column type="index"></el-table-column>
                    <el-table-column prop="field" label="字段名"></el-table-column>
                    <el-table-column prop="type" label="字段类型"></el-table-column>
                    <el-table-column prop="comment" label="备注">
                        <template slot-scope="scope">
                            <el-input v-model="scope.row.comment"></el-input>
                        </template>
                    </el-table-column>
                    <template v-for="(field,index) in config.fields">
                        <el-table-column :prop="field.name" :label="field.title" :key="index">
                            <template slot-scope="scope">
                                <el-select v-if="field.type == 'select'" v-model="scope.row[field.name]" placeholder="请选择">
                                    <el-option
                                        v-for="item in field.options"
                                        :key="item.value"
                                        :label="item.label"
                                        :value="item.value">
                                    </el-option>
                                </el-select>
                                <el-input v-if="field.type == 'input'" v-model="scope.row[field.name]"></el-input>
                            </template>
                        </el-table-column>
                    </template>
                </el-table>
            </div>
			<div ref="monaco" class="monacoClass" v-show="isMonacoShow"></div>
			<span slot="footer" class="dialog-footer">
				<!-- <el-button @click="dialogVisible = false">取 消</el-button> -->
				<el-button @click="isMonacoShow = !isMonacoShow">{{ isMonacoShow ? '取消预览' : '预览Model' }}</el-button>
				<el-button type="primary" @click="generate">确 定</el-button>
			</span>
		</el-dialog>
	</div>
</template>

<script>
import axios from "axios"
import * as monaco from 'monaco-editor';
// import HelloWorld from "./components/HelloWorld.vue";


axios.defaults.baseURL = process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:6688';
export default {
	name: "app",
	// components: {
	// 	HelloWorld
	// },
	data() {
		return {
			config: {},	// 用户的配置文件
			tableNames: [],	// 表名
			loading: false,
			loadNum: 0,
			tableName: '',
			dialogVisible: false,
			isMonacoShow: false,
			fieldList: [],	// 某张表的字段列表
			editor: "",
		}
	},
	mounted() {
		this.getTableName();
		this.getConfig();
	},
	methods: {
		getConfig() {
			this.loadNum++;
			axios.get('/config').then(res => {
				this.config = res.data;
			}).catch(e => console.log(e)).finally(() => this.loadNum--);
		},
		getTableName() {
			this.loadNum++;
			axios.get('/table/list').then(res => {
				this.tableNames = res.data;
			}).catch(e => console.log(e)).finally(() => this.loadNum--);
		},
		openDialog(index, row) {
			this.dialogVisible = true;
			this.loadNum++;
			this.tableName = row.name;
			axios.get('/table/fields/info?name='+this.tableName).then(res => {
				res.data.forEach(item => {
					if(this.config.fields) {
						this.config.fields.forEach(f => item[f.name] = f.default)
					}
				})
				this.fieldList = res.data;
			}).catch(e => console.log(e)).finally(() => this.loadNum--);
		},
		generate(index, row) {
			this.loadNum++;
			let model = this.getModel();
			axios.post('generate', model).then(res => {
				this.$message({ message: '生成成功', type: 'success' });
				this.dialogVisible = false;
			}).catch(e => console.log(e)).finally(() => this.loadNum--);
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
	// computed: {
	// 	tableData() {
	// 		return this.tableNames;
	// 	}
	// },
	watch: {
		loadNum(newVal, oldVal) {
			if(newVal === 0) {
				this.loading = false;
			} else {
				this.loading = true;
			}
		},
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

.monacoClass {
	height: 70vh;
}
</style>
