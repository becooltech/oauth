/**
 * Created on 2017/5/14.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
// ucs-2 string to base64 encoded ascii
function encode (str) {
    return window.btoa(window.unescape(window.encodeURIComponent(str)));
}
// base64 encoded ascii to ucs-2 string
function decode (str) {
    return window.decodeURIComponent(window.escape(window.atob(str)));
}

module.exports = {encode: encode, decode: decode};
