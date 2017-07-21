/**
 * Created on 2017/7/20.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
var initialized = false;
if (typeof global !== 'undefined' && !initialized) {
    initialized = true;
    global.window = global.window || {};

    window.btoa = function (str) {
        var buf = new Buffer(str);
        return buf.toString('base64');
    };

    window.atob = function (str) {
        var buf = new Buffer(str, 'base64');
        return buf.toString();
    };

    // Buffer 类已支持 unicode
    window.unescape =
        window.encodeURIComponent =
            window.decodeURIComponent =
                window.escape = function (str) {
                    return str;
                };
}
