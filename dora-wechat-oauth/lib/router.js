/**
 * Created on 2017/5/16.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
var URL = require('url');
var qs = require('querystring');

module.exports = {
    route: function (url, options) {
        url = URL.parse(url).pathname;
        return function (req, res, next) {
            var urlObj = URL.parse(req.url);
            if (urlObj.pathname !== url || (req.method.toLocaleLowerCase() !== options.method.toLowerCase())) {
                return next();
            }
            req.query = req.query || {};
            if (urlObj.query) {
                req.query = req.query || qs.parse(urlObj.query);
            }
            try {
                options.action(req, res, next);
            } catch (e) {
                console.error(e.stack);
                res.status(500).send(e.message);
            }
        };
    }
};
