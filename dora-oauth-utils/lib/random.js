/**
 * Created on 2017/5/15.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
var randomstring = function (len) {
    var s = '';
    var randomchar = function () {
        var n = Math.floor(Math.random() * 62);
        if (n < 10) {
            return n;
        } //1-10
        if (n < 36) {
            return String.fromCharCode(n + 55);
        } //A-Z
        return String.fromCharCode(n + 61); //a-z
    };
    while (s.length < len) {
        s += randomchar();
    }
    return s;
};

var Random = {
    id: function (len) {
        return randomstring(len || 17);
    },
    secret: function (len) {
        return randomstring(len || 43);
    }
};

module.exports = Random;