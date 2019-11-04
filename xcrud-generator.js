module.exports = {
    // 数据库配置
    db: {
        host: "192.168.39.36",
        user: "root",
        password: "root",
        database: "submarine" // 数据库名
    },
    // 直接混入的参数（可选）
    mixin: {
        package: "org.xcrud", // 例如混入包名
        entity: ""
    },
    // 自定义数据库字段的信息，自动生成到页面中（可选）
    fields: [
        {
            title: "列表展示",
            name: "isTableShow",
            default: true,
            type: "checkbox",
            width: "80"
        },
        {
            title: "表单展示",
            name: "isFormShow",
            default: true,
            type: "checkbox",
            width: "80"
        },
        {
            title: "前端搜索",
            name: "isFrontSearch",
            default: false,
            type: "checkbox",
            width: "80"
        },
        {
            title: "非空",
            name: "isNotNull",
            default: false,
            type: "checkbox",
            width: "80"
        },
        {
            title: "表单类型",
            name: "formType",
            default: "",
            type: "select",
            options: [
                { label: "单行文本框", value: "input" },
                { label: "多行文本框", value: "input,textarea" },
                { label: "下拉选择框", value: "select" },
                { label: "时间选择器", value: "timeSelect" },
                { label: "时间范围选择器", value: "timeSelect,isRange" },
                { label: "日期选择器", value: "datePicker,date" },
                { label: "日期范围选择器", value: "datePicker,daterange" },
                { label: "日期时间选择器", value: "datePicker,datetime" },
                {
                    label: "日期时间范围选择器",
                    value: "datePicker,datetimerange"
                },
                { label: "树形选择框", value: "select,tree" },
                { label: "级联选择器", value: "cascader" },
                { label: "switch 开关", value: "switch" },
                { label: "slider 滑块", value: "slider" },
                { label: "radio 单选框", value: "radio" },
                { label: "checkbox 多选框", value: "checkbox" }
            ]
        },
        {
            title: "sql",
            name: "sqlType",
            default: "",
            type: "select",
            options: [
                { label: '=', value: '=' },
                { label: '!=', value: '!=' },
                { label: '>', value: '>' },
                { label: '>=', value: '>=' },
                { label: '<', value: '<' },
                { label: '<=', value: '<=' },
                { label: 'Between', value: 'Between' },
                { label: 'Like', value: 'Like' },
                { label: 'Left Like', value: 'Left Like' },
                { label: 'Right Like', value: 'Right Like' }
            ]
        },
        {
            title: "校验类型",
            name: "verifyType",
            default: "",
            type: "select",
            options: [
                { label: "数字", value: "number" },
                { label: "整数", value: "integer" },
                { label: "整数(大于0)", value: "integerGtZero" },
                { label: "整数(大于等于0)", value: "integerGtEqZero" },
                { label: "小数(大于0)", value: "floatGtZero" },
                { label: "小数(大于等于0)", value: "floatGtEqZero" },
                { label: "邮箱", value: "email" },
                { label: "电话", value: "phone" },
                { label: "ip", value: "ip" }
            ]
        },
        {
            title: "字符长度",
            name: "strLenRange",
            default: "",
            type: "input",
            width: "120",
            placeholder: "min,max"
        },
        {
            title: "数字范围",
            name: "numRange",
            default: "",
            type: "input",
            width: "120",
            placeholder: "min,max"
        }
    ],
    // 模板文件夹，只支持ejs语法，模板文件要以ejs为后缀
    input: {
        dir: "./template/"
    },
    // 模板文件输出配置，指定每个模板文件的输出位置
    output: [
        {
            template: "controller.ejs", // 模板文件名
            path: "./gen/<%= tableName %>/controller/Controller.java" // 当前模板的输出位置，路径支持ejs语法
        },
        {
            template: "dao.ejs",
            path: "./gen/<%= tableName %>/dao/dao.java"
        }
    ]
};
