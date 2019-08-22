//模板字符串转换
var StrUtil = {
    // 下划线转驼峰
    underscoreToCamel: (str) => {
        return str.replace(/\_(\w)/g, function(all, letter){
            return letter.toUpperCase();
        });
    },
    // 驼峰转下划线
    camelToUnderscore: (str) => {
        let strResult = str.replace(/([A-Z])/g, function(all, letter){
            return "_" + letter.toLowerCase();
        });
        return strResult.replace(/^\_/, '');
    },
    // 首字母小写
    initialLowerCase: (str) => {
        return str.replace(/^(\w)/g, function(all, letter){
            return letter.toLowerCase();
        });
    },
    // 首字母大写
    initialUpperCase: (str) => {
        return str.replace(/^(\w)/g, function(all, letter){
            return letter.toUpperCase();
        });
    },
    // 全部小写
    toLowerCase: (str) => {
        return str.toLowerCase();
    },
    // 全部大写
    toUpperCase: (str) => {
        return str.toUpperCase();
    },
}

module.exports = StrUtil;