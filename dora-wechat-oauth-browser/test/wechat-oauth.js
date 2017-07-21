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
const OAuthHelpers = OAuth._OAuthHelpers;
const sinon = require('sinon');
const request = require('request');
const server = require('dora-oauth-mock/app-server');
const accountsServer = require('dora-oauth-mock/accounts-server');

const accountsServerPort = 9000;
let accountsServerUrl = 'http://127.0.0.1:' + accountsServerPort;
describe('WechatOAuth', function () {
    let appId = 'appId',
        rootUrl,
        openid = Random.secret(),
        unionid = Random.secret();
    let Wechat, credentialToken;
    let getCredentialUrl = function (uri) {
        return accountsServerUrl + uri;
    };
    let cleanConfigUrl = getCredentialUrl('/accounts/oauth/2/wechat/configs/wx');
    before('initialize', function (done) {
        client.all();
        let port = 9999;
        rootUrl = 'http://localhost:' + port;
        let WechatOAuth = require('../client/lib');
        Wechat = new WechatOAuth(appId, {
            rootUrl,
            env: 'wx'
        });
        credentialToken = Random.id();
        server({
            appId,
            OAuthInstance: Wechat,
            secret: Random.secret(),
            credentialsServerUrl: accountsServerUrl,
            port,
            openid,
            unionid,
            id: unionid,
            credentialToken,
            getCredentialUrl,
            cleanConfigUrl,
            request,
        }, function () {
            done();
        });
    });

    before('stubs', function () {
        sinon.stub(OAuthHelpers, 'launchLogin').callsFake(function (options) {
            if (!options.loginService) {
                throw new Error('loginService required');
            }
            if (options.loginStyle === 'redirect') {
                OAuthHelpers.saveDataForRedirect(options.loginService, options.credentialToken);
            } else if (options.loginStyle !== 'popup') {
                throw new Error('invalid login style');
            }
            options.credentialRequestCompleteCallback.bind(null, options.credentialToken);
            return options;
        });
    });

    before('initialize accounts server', function (done) {
        accountsServer({
            OAuthInstance: Wechat,
            port: accountsServerPort
        }, done);
    });

    it('#getAuthorizeURL()', function () {
        let loginStyle = 'redirect';
        let state = Wechat.encodeState(credentialToken, loginStyle);
        let url = Wechat.getAuthorizeURL(loginStyle, state);
        let urlObj = URL.parse(url);
        let obj = {
            protocol: urlObj.protocol,
            host: urlObj.host,
            hash: urlObj.hash,
            pathname: urlObj.pathname,
            query: qs.parse(urlObj.query)
        };
        assert.deepEqual(obj, {
            protocol: 'https:',
            host: 'open.weixin.qq.com',
            hash: '#wechat_redirect',
            pathname: '/connect/oauth2/authorize',
            query: {
                appid: 'appId',
                redirect_uri: Wechat.oauthHandleUrl,
                response_type: 'code',
                scope: 'snsapi_userinfo',
                state: obj.query.state
            }
        });
        let stateObj = JSON.parse(Base64.decode(obj.query.state));
        assert.deepEqual(stateObj, {
            credentialToken: credentialToken,
            loginStyle: loginStyle,
            env: 'wx'
        });
    });

    it('#getAuthorizeURLForWebsite()', function () {
        let loginStyle = 'popup';
        let state = Wechat.encodeState(credentialToken, loginStyle);
        let url = Wechat.getAuthorizeURLForWebsite(state);
        let urlObj = URL.parse(url);
        let obj = {
            protocol: urlObj.protocol,
            host: urlObj.host,
            hash: urlObj.hash,
            pathname: urlObj.pathname,
            query: qs.parse(urlObj.query)
        };
        assert.deepEqual(obj, {
            protocol: 'https:',
            host: 'open.weixin.qq.com',
            hash: '#wechat_redirect',
            pathname: '/connect/qrconnect',
            query: {
                appid: 'appId',
                redirect_uri: Wechat.oauthHandleUrl,
                response_type: 'code',
                scope: 'snsapi_login',
                state: obj.query.state
            }
        });
        let stateObj = JSON.parse(Base64.decode(obj.query.state));
        assert.deepEqual(stateObj, {
            credentialToken: credentialToken,
            loginStyle: loginStyle,
            env: 'wx'
        });
    });

    it('#login()', function (done) {
        let loginStyle = 'redirect';
        let options = Wechat.login({loginStyle: loginStyle});
        let urlObj = URL.parse(options.loginUrl);
        let query = qs.parse(urlObj.query);
        let redirectUrlObj = URL.parse(query.redirect_uri);
        let _urlObj = {
            protocol: redirectUrlObj.protocol,
            host: redirectUrlObj.host,
            pathname: redirectUrlObj.pathname,
            query: {
                code: Random.secret(),
                state: query.state
            }
        };
        let url = URL.format(_urlObj);
        request(url, {method: 'GET'}, function (err, response, body) {
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

            let config = JSON.parse(/\>(\{.+)\<\/div\>/.exec(lines[0])[1]);
            client.document(config);
            let scriptUrl = /src\=\"([^"]+)\"/.exec(lines[1])[1];
            scriptUrl = rootUrl + scriptUrl;
            request(scriptUrl, {method: 'GET'}, function (err, response, body) {
                if (err) {
                    assert.fail(err);
                    return done();
                }
                eval(body);
                let key = config.storagePrefix + config.credentialToken;
                let credentialSecret = localStorage[key] || sessionStorage[key];
                assert.equal(credentialSecret, config.credentialSecret);
                done();
            });
        });
    });

    it('#loginWithCredentials()', function (done) {
        Wechat.loginWithCredentials('credentialToken', 'credentialSecret', function (err, res) {
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
