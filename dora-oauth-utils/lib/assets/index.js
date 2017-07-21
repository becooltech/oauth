/**
 * Created on 2017/5/15.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';

var fs = require('fs');
var path = require('path');
var URL = require('url');
var defaults = require('../constants').defaults;

var MIME_TYPE = {
    'html': 'text/html',
    'js': 'text/javascript'
};

var resolvePath = function (file) {
    return path.resolve(__dirname, file);
};

var assets = {
    'end_of_popup_response.html': fs.readFileSync(resolvePath('./end_of_popup_response.html')).toString(),
    'end_of_popup_response.js': fs.readFileSync(resolvePath('./end_of_popup_response.js')).toString(),
    'end_of_redirect_response.html': fs.readFileSync(resolvePath('./end_of_redirect_response.html')).toString(),
    'end_of_redirect_response.js': fs.readFileSync(resolvePath('./end_of_redirect_response.js')).toString()
};

var escape = function (s) {
    if (s) {
        return s.replace(/&/g, '&amp;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;').
        replace(/'/g, '&quot;').
        replace(/'/g, '&#x27;').
        replace(/\//g, '&#x2F;');
    }
    return s;
};

var escapeKeys = ['credentialToken', 'credentialSecret', 'storagePrefix', 'redirectUrl'];

var escapeConfigs = function (configs) {
    Object.keys(configs).forEach(function (field) {
        if (escapeKeys.indexOf(field) < 0) {
            return;
        }

        var s = configs[field];
        if (typeof s === 'string') {
            configs[field] = escape(s);
        }
    });
    return configs;
};

var output = {
    rootUrlPrefix: null,
    assets: assets,
    replaceRootUrlPrefix: function (prefix) {
        output.rootUrlPrefix = prefix || '';
        var rootUrlPrefix = output.rootUrlPrefix += defaults.assetsUri;
        Object.keys(assets).filter(function (name) {
            return /\.html$/.test(name);
        }).forEach(function (name) {
            assets[name] = assets[name].replace(/##ROOT_URL_PATH_PREFIX##/, rootUrlPrefix);
        });
        return rootUrlPrefix;
    },
    getTemplate: function (loginStyle, configs) {
        var html = loginStyle === 'popup' ? 'end_of_popup_response' : 'end_of_redirect_response';
        return assets[html + '.html']
            .replace(/##CONFIG##/, JSON.stringify(escapeConfigs(configs)));
    },
    middleware: function () {
        var assetsPathname = URL.parse(output.rootUrlPrefix).pathname;
        return function (req, res, next) {
            var urlObj = URL.parse(req.url);
            /* eslint no-useless-escape: 'warn' */
            if (!new RegExp('^' + assetsPathname + '/\\w+\.js$').test(urlObj.pathname) ||
                req.method.toUpperCase() !== 'GET') {
                return next();
            }

            var filename = /(\w+\.\w+)$/.exec(req.url)[1];

            var ext = path.extname(filename);
            ext = ext ? ext.slice(1) : 'unknown';

            var assetsText = assets[filename];

            if (!assetsText) {
                assetsText = '<h1>500</h1>服务器内部错误！';
            } else {
                res.writeHead(200, {'content-type': MIME_TYPE[ext] || 'text/plain'});
            }

            res.end(assetsText);
        };
    }
};

module.exports = output;