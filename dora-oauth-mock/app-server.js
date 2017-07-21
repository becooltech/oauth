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
    const getUri = name => OAuthInstance[name].replace(OAuthInstance.rootUrl, '');
    const getAccountsUrl = uri => URL.resolve(credentialsServerUrl, uri.replace(OAuthInstance.rootUrl, '').replace(/^\//, ''));

    let oauthHandleUrl = getUri('oauthHandleUrl');
    let proxyCredentialLoginUrl = getUri('proxyCredentialLoginUrl');

    app.get(oauthHandleUrl, (req, res) => {
        let urlObj = URL.parse(req.url, true);
        let {code, state} = urlObj.query;
        if (!code || !state) {
            return res.status(500).send(`${code && 'code' || 'state'} not found in query.`);
        }

        request(getAccountsUrl(req.url), {
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
            console.log(err, body);
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

    app.all(proxyCredentialLoginUrl, (req, res) => {
        let options = {
            headers: req.headers
        };
        if (!_.isEmpty(req.body)) {
            options.body = JSON.stringify(req.body);
        }
        request[req.method.toLowerCase()](getAccountsUrl(req.url), options, (err, response, body) => {
            res.writeHead(response.statusCode, response.headers);
            res.end(body);
        });
    });

    app.use(Assets.middleware());

    app.all('*', function (req, res) {
        console.log(OAuthInstance);
        console.log(Assets);
        res.setHeader('Content-Type', 'application/json');
        console.log(_.pick(req, 'url', 'method', 'headers'));
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
