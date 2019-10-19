module.exports = {
    // 数据库配置
    db: {
        host: "192.168.39.36",
        user: "root",
        password: "root",
        database: "submarine"  // 数据库名
    },
    // 直接混入的参数（可选）
    mixin: {
        package: "org.xcrud",  // 例如混入包名
        entity: ""
    },
    // 自定义数据库字段的信息，自动生成到页面中（可选）
    fields: [
        {
            title: "启用禁用",
            name: "enable",
            default: "",  // 默认值
            type: "select", // type支持两种：select（下拉选择）和input（输入框）
            options: [
                // 设置下拉选项
                { label: "启用", value: "enable" },
                { label: "冻结", value: "disable" }
            ]
        },
        {
            title: "地址",
            name: "address",
            default: "",
            type: "input" // 输入框
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
            path: "./gen/<%= tableName %>/controller/Controller.java"  // 当前模板的输出位置，路径支持ejs语法
        },
        {
            template: "dao.ejs",
            path: "./gen/<%= tableName %>/dao/dao.java"
        }
    ]
};
