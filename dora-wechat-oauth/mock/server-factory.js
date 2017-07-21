/**
 * Created on 2017/7/20.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
const express = require('express');
const bodyParser = require('body-parser');

module.exports = () => {
    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.text());
    app.use(bodyParser.urlencoded({extended: false}));

    return app;
};
