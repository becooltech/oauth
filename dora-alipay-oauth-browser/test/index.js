/**
 * Created on 2017/5/16.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';

const client = require('dora-oauth-mock/app-client');
const assert = require('chai').assert;
const URL = require('url');
const qs = require('querystring');
const OAuth = require('dora-oauth-browser');
const Random = OAuth.Random;
const Base64 = OAuth.Base64;
const request = require('request');
const server = require('dora-oauth-mock/app-server');
const lauchLogin = require('dora-oauth-mock/lauch-login');
const accountsServer = require('dora-oauth-mock/accounts-server');

const accountsServerPort = 9000;

const unescapeConfig = config => {
    ['credentialToken', 'credentialSecret', 'storagePrefix', 'redirectUrl']
        .forEach(field => config[field] && (
                config[field] = config[field].replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '\"')
                    .replace(/&#x27;/g, '\'')
                    .replace(/&#x2F;/g, '/')
            )
        );
    return config;
};

let accountsServerUrl = 'http://127.0.0.1:' + accountsServerPort;

describe('AlipayOAuth', function () {
    let appId = 'appId',
        rootUrl,
        id = Random.secret();
    let Alipay, credentialToken;
    let getCredentialUrl = function (uri) {
        return accountsServerUrl + uri;
    };
    let cleanConfigUrl = getCredentialUrl('/accounts/oauth/2/alipay/configs/wx');
    before('initialize', function (done) {
        client.all();
        let port = 9999;
        rootUrl = 'http://localhost:' + port;
        let AlipayOAuth = require('../client/lib');
        let rootPrefix = 'test_oauth/2';
        Alipay = new AlipayOAuth(appId, {
            rootUrl,
            rootPrefix,
            env: 'wx'
        });
        credentialToken = Random.id();
        server({
            appId,
            OAuthInstance: Alipay,
            rootPrefix,
            secret: Random.secret(),
            credentialsServerUrl: accountsServerUrl,
            port,
            id,
            credentialToken,
            getCredentialUrl,
            cleanConfigUrl,
            request,
        }, function () {
            done();
        });
    });

    before('initialize accounts server', done => accountsServer({
        port: accountsServerPort,
        OAuthInstance: Alipay
    }, done));

    before('stubs', () => lauchLogin(OAuth, request));

    it('#getAuthorizeURL()', function () {
        let loginStyle = 'redirect';
        let state = Alipay.encodeState(credentialToken, loginStyle);
        let url = Alipay.getAuthorizeURL(loginStyle, state);
        let urlObj = URL.parse(url);
        let obj = {
            protocol: urlObj.protocol,
            host: urlObj.host,
            pathname: urlObj.pathname,
            query: qs.parse(urlObj.query)
        };

        assert.match(url, /^https\:\/\/\w+(\.\w+)+(\/\w+)+(\.\w+)?\?app_id=[^&]+\&scope=[^&]+&redirect_uri=[^&]+&state=[^&]+$/);
        assert.deepEqual(obj, {
            protocol: 'https:',
            host: 'openauth.alipay.com',
            pathname: '/oauth2/publicAppAuthorize.htm',
            query: {
                app_id: 'appId',
                redirect_uri: 'http://localhost:9999/test_oauth/2/alipay',
                state: obj.query.state,
                scope: 'auth_userinfo'
            }
        });
        let stateObj = JSON.parse(Base64.decode(obj.query.state));
        assert.deepEqual(stateObj, {
            credentialToken: credentialToken,
            loginStyle: loginStyle
        });
    });

    it('#login()', function (done) {
        Alipay.login({loginStyle: 'redirect'})
            .call(function (err, response, body) {
                if (err) {
                    console.error(err.stack || err);
                    assert.fail();
                    done();
                }
                let lines = body.split(/\r?\n/).map(function (line) {
                    return line.trim();
                }).filter(function (line) {
                    return /^\<div id\=\"config\"|\<script type/.test(line);
                });

                let config = unescapeConfig(JSON.parse(/\>(\{.+)\<\/div\>/.exec(lines[0])[1]));
                client.document(config);
                let scriptUrl = /src\=\"([^"]+)\"/.exec(lines[1])[1];
                scriptUrl = rootUrl + scriptUrl;
                request(scriptUrl, {method: 'GET'}, function (err, response, body) {
                    if (err) {
                        assert.fail(err);
                        return done();
                    }

                    /* eslint no-eval: 'off' */
                    eval(body);
                    let key = config.storagePrefix + config.credentialToken;
                    let credentialSecret = localStorage[key] || sessionStorage[key];
                    assert.equal(credentialSecret, config.credentialSecret);
                    done();
                });
            });
    });

    it('#loginWithCredentials()', function (done) {
        Alipay.loginWithCredentials('credentialToken', 'credentialSecret', function (err, res) {
            if (err) {
                console.log(err);
            }
            assert.equal(localStorage['Meteor.userId'], 'id');
            assert.equal(localStorage['Meteor.loginToken'], 'token');
            assert.equal(localStorage['Meteor.loginTokenExpires'], 'tokenExpires');
            done();
        });
    });
});
