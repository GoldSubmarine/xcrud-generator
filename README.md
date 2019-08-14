# xcrud-tpl

查询数据库表字段，快速生成模板代码，不区分项目语言，前后端都可使用

使用 ejs 模板语法

## 安装

```bash
yarn global add xcrud-tpl
# or
npm install xcrud-tpl -g
```

## 使用

在项目根目录新建 `crud.json` 配置文件，可用配置如下：

```json
{
  // 数据库配置
  "db": {
    "host": "192.168.1.100", // 主机ip
    "user": "root", // 登录名
    "password": "root", // 密码
    "database": "xcrud-test-db" // 数据库名
  },
  // 直接混入的参数（可选）
  "mixin": {
    "package": "com.js" // 例如混入包名
  },
  // 自定义数据库字段的信息，自动生成到页面中
  "fields": [
    {
      "title": "启用禁用", // 页面显示使用
      "name": "enable", // 键值，在模板中使用
      "default": "enable", // 默认值
      "type": "select", // type支持两种：select（下拉选择）和input（输入框）
      "options": [
        // 设置下拉选项
        { "label": "启用", "value": "enable" },
        { "label": "冻结", "value": "disable" }
      ]
    },
    {
      "title": "地址",
      "name": "address",
      "default": "",
      "type": "input" // 输入框
    }
  ],
  // 模板文件夹，只支持ejs语法，模板文件要以ejs为后缀
  "input": {
    "dir": "./template/"
  },
  // 模板文件输出配置，指定每个模板文件的输出位置
  "output": [
    {
      "template": "controller.ejs", // 模板文件名
      "path": "./gen/<%= tableName %>/controller/Controller.java" // 当前模板的输出位置，路径支持ejs语法
    },
    {
      "template": "dao.ejs",
      "path": "./gen/<%= tableName %>/dao/dao.java"
    }
  ]
}
```

配置好文件后，使用命令 `xcrud` 启动服务

![xcrud-tpl-1](./public/xcrud-tpl-1)

打开 `http://localhost:6688` 后，可以看到页面列出了所有的表

![xcrud-tpl-2](./public/xcrud-tpl-2)

点击某张表的生成代码按钮，之前在 `xcrud.json` 中配置的下拉框和输入框都展示在弹窗中

![xcrud-tpl-3](./public/xcrud-tpl-3)

输入相关的信息后，点击底部的 预览Model 按钮，可以看到一个json，json中的变量都可在 ejs模板 和 生成路径 中使用

![xcrud-tpl-4](./public/xcrud-tpl-4)

点击确定，即可生成代码。（**注意：**要在配置的`./template/`文件夹中写好 ejs模板 哦）

## 优点

- 无侵入，只需在项目中添加 json 配置文件，写好模板即可
- 自定义参数，根据自身需求，在页面中混入参数
- 动态路径，生成的文件路径可动态生成，支持 ejs 语法
