/**
 * Created on 2017/5/16.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
const URL = require('url');
let Assets = require('dora-oauth-browser/lib/assets');
const app = require('./server-factory')();
const request = require('request');
const _ = require('lodash');

let routes = ({OAuthInstance, credentialsServerUrl, id, _Assets}) => {
    Assets = _Assets || Assets;
    const getUri = name => URL.parse(OAuthInstance[name]).pathname;
    const getAccountsUrl = uri => URL.resolve(credentialsServerUrl, uri.replace(OAuthInstance.rootUrl, '').replace(/^\//, ''));

    let oauthHandleUrl = getUri('oauthHandleUrl');
    let proxyCredentialLoginUrl = getUri('proxyCredentialLoginUrl');

    OAuthInstance.oauthHandler && app.use(function (...args) {
        OAuthInstance.oauthHandler()(...args);
    }) ||
    app.get(oauthHandleUrl, (req, res) => {
        let urlObj = URL.parse(req.url, true);
        let {code, state} = urlObj.query;
        if (!code || !state) {
            return res.status(500).send(`${code && 'code' || 'state'} not found in query.`);
        }

        let url = `${getAccountsUrl(OAuthInstance.storeCredentialsUrl)}${urlObj.search}`;
        request(url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                serviceData: {
                    id,
                    nickname: 'NICKNAME',
                    sex: 2,
                    language: 'zh_CN'
                }
            })
        }, function (err, response, body) {
            body = JSON.parse(body);
            let configs = {
                setCredentialToken: !!(body.state.credentialToken && body.credentialSecret),
                credentialToken: body.state.credentialToken,
                credentialSecret: body.credentialSecret,
                storagePrefix: 'Meteor.oauth.credentialSecret-',
                redirectUrl: URL.resolve(OAuthInstance.rootUrl, body.state.redirectUrl)
            };
            let temp = Assets.getTemplate(body.state.loginStyle, configs);
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(temp);
        });
    });

    console.log({proxyCredentialLoginUrl})
    app.all(proxyCredentialLoginUrl, (req, res) => {
        let options = {
            headers: req.headers
        };
        if (!_.isEmpty(req.body)) {
            options.body = JSON.stringify(req.body);
        }
        let url = getAccountsUrl(OAuthInstance.credentialLoginUrl);
        request[req.method.toLowerCase()](url, options, (err, response, body) => {
            res.writeHead(response.statusCode, response.headers);
            res.end(body);
        });
    });

    app.use(Assets.middleware());

    app.use((err, req, res) => {
        res.status(500).send(err.stack);
    });

    app.all('*', function (req, res) {
        console.log(OAuthInstance);
        res.setHeader('Content-Type', 'application/json');
        console.log(_.pick(req, 'url', 'method', 'headers', 'body'));
        console.trace(`404: ${req.method}, ${req.url}`);
        res.status(404).send(`[${req.method} - ${req.url}] not found.`);
    });
};

module.exports = (options, cb) => {
    let OAuthInstance = options.OAuthInstance;
    Assets.replaceRootUrlPrefix(OAuthInstance.rootPrefix.replace(`${OAuthInstance.rootUrl}`, ''));
    routes(options);

    return app.listen(options.port, (...args) => {
        console.log(`OAuth server running on port ${options.port}.`);
        cb && cb(...args);
    });
};

module.exports.app = app;
