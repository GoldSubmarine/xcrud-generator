const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
    productionSourceMap: process.env.NODE_ENV !== 'production',
    configureWebpack: {
      plugins: [
        new MonacoWebpackPlugin({
            languages:['json']
        })
      ]
    }
}
