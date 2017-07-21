/**
 * Created on 2017/5/15.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
const CONSTANTS = require('../lib/constants');
const _WechatOAuth = require('wechat-oauth');
const request = require('request');
const querystring = require('querystring');
const assert = require('chai').assert;
const randomstring = require('randomstring');
const WechatOAuth = require('../server/lib');
const server = require('../mock/app-server');
const client = require('../mock/app-client');
const accountsServer = require('../mock/accounts-server');
const sinon = require('sinon');

const STORAGE_TOKEN_PREFIX = CONSTANTS.STORAGE_TOKEN_PREFIX;
client.all();

const accountsServerPort = 9000;
let accountsServerUrl = `http://127.0.0.1:${accountsServerPort}`;
const Base64 = {
    encode: function (str) {
        let buf = new Buffer(str);
        return buf.toString('base64');
    }
};

const Random = {
    secret: function () {
        return randomstring.generate(43);
    },
    id: function () {
        return randomstring.generate(17);
    }
};

const encodeState = function (state, credentialToken, loginStyle, options) {
    let res = state;
    res = res || {};
    options = options || {};
    if (typeof res !== 'object') {
        res = res ? {str: res} : {};
    }

    if (options.redirectUrl) {
        res.redirectUrl = options.redirectUrl;
    }

    res.credentialToken = res.credentialToken || credentialToken;
    return Base64.encode(JSON.stringify(Object.assign(res, {loginStyle, env: 'wx'}, options.state)));
};

describe('WechatOAuth', function () {
    let Wechat,
        localPort = 9999,
        openid = Random.secret(),
        unionid = Random.secret(),
        credentialToken = Random.secret();

    let config = {
        env: 'wx',
        appId: 'appId',
        secret: 'secret'
    };
    let getCredentialUrl = function (uri) {
        return `${accountsServerUrl}${uri}`;
    };
    let cleanConfigUrl = getCredentialUrl('/accounts/oauth/2/wechat/configs/wx');
    let cleanConfig = function (done) {
        request(cleanConfigUrl, {
            method: 'DELETE'
        }, function () {
            try {
                done();
            } catch (e) {
                console.error(e.stack);
            }
        });
    };
    let generateConfig = function (done) {
        request(cleanConfigUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({config, idField: 'appId'})
        }, function (err, response, body) {
            done();
        });
    };

    before('initialize', function (done) {
        Wechat = new WechatOAuth('appId', 'secret', {
            resultHandler () {},
            rootUrl: 'http://localhost:9999',
            credentialsServer: accountsServerUrl,
        });
        WechatOAuth.chooseInstance = function () {
            return Wechat;
        };
        let port = localPort;
        credentialToken = Random.id();
        server({
            port,
            openid,
            id: unionid,
            unionid,
            OAuthInstance: Wechat,
            credentialsServerUrl: accountsServerUrl,
            credentialToken,
            getCredentialUrl,
            cleanConfigUrl,
            Wechat,
            _WechatOAuth,
            request
        }, function () {
            done();
        });
    });
    before('initialize accounts server', function (done) {
        accountsServer({
            OAuthInstance: Wechat,
            port: accountsServerPort
        }, done);
    });

    before('clean config', cleanConfig);

    before('generate config', generateConfig);

    let stubsList = [];

    before('stubs', function () {
        stubsList.push(
            sinon.stub(WechatOAuth._parent.prototype, 'getAccessToken')
                .callsFake(function (code, callback) {
                    callback(null, {
                        data: {
                            access_token: 'ACCESS_TOKEN',
                            expires_in: 7200,
                            refresh_token: 'REFRESH_TOKEN',
                            openid,
                            scope: 'SCOPE'
                        }
                    });
                }),
            sinon.stub(WechatOAuth._parent.prototype, '_getUser')
                .callsFake(function (data, accessToken, cb) {
                    cb(null, {
                        openid,
                        unionid,
                        nickname: 'NICKNAME',
                        sex: 1,
                        province: 'PROVINCE',
                        city: 'CITY',
                        country: 'COUNTRY',
                        headimgurl: 'http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46',
                        privilege: []
                    }, {});
                })
        );
    });

    after('clean config', cleanConfig);
    after('clean stubs', () => stubsList.forEach(stub => stub.restore()))

    it('#createCredentials()', function (done) {
        Wechat.createCredentials({
            code: Random.secret(),
            state: encodeState(undefined, credentialToken, 'redirect')
        }, function (err, body) {
            if (typeof body === 'string') {
                body = JSON.parse(body);
            }
            assert.property(body, 'credentialSecret');
            assert.property(body, 'state');
            assert.property(body.state, 'credentialToken');
            done();
        });
    });

    describe('#getAccessToken', function () {
        let mockData = {
            'access_token': 'x9WtwDzNJ2fi_vdQRhGOCzh6GFHjGcAPw0e3ofLbwo8r2HebnLa7ZomqSgQpnbeeMjjraUyeGtHSwd81CEczOTrHfRq86OmnEU8bQ_a2cHw',
            'expires_in': 7200,
            'refresh_token': '-9XRDJvWM6AJkzed1flmYqrYvTURqaq1aRM8BguLQ_1-6RB8IWfNWHP3r4mk1P8e9epTPn99cGBssxfGGndCVSI_O7H18ZaCJL2jAjggkxw',
            'openid': 'oAo0MwCtalPoVWe390T5BIH6xWRk',
            'scope': 'snsapi_userinfo',
            'unionid': 'o2YP_tiHFUhoSRO1YOW-xVB0VWPQ'
        };
        let stored;
        before('stub #request()', function () {
            sinon.stub(Wechat, 'request').callsFake(function (url, options, callback) {
                callback(null, mockData);
            });
            if (Wechat.getAccessToken.restore) {
                stored = Wechat.getAccessToken;
                Wechat.getAccessToken.restore();
            }
        });
        after('restore #request()', function () {
            stored && stored.restore();
        });

        it('execute:', function (done) {
            Wechat.getAccessToken('code', function (err, res) {
                assert.equal(res.data.access_token, mockData.access_token);
                assert.equal(res.data.refresh_token, mockData.refresh_token);
                assert.equal(res.data.openid, mockData.openid);
                assert.equal(res.data.unionid, mockData.unionid);
                done();
            });
        });
    });

    it('loginWithCredentials()', function (done) {
        let state = encodeState(unionid, credentialToken, 'redirect');
        let queryObj = {code: Random.secret(), state: state};
        Wechat.createCredentials(queryObj, function (err, credentials) {
            let credentialSecret = credentials.credentialSecret;
            let credentialToken = credentials.state.credentialToken;
            WechatOAuth.loginWithCredentials(credentialToken, credentialSecret, function (err, body) {
                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
                if (err) {
                    console.error(err.stack || err);
                    assert.fail(err, null);
                    return done();
                }
                assert.property(body.data, 'id');
                assert.property(body.data, 'token');
                assert.property(body.data, 'tokenExpires');
                done();
            });
        });
    });

    describe('middlewares', function () {
        it('oauthHandler()', function (done) {
            let state = encodeState(unionid, credentialToken, 'redirect');
            request(`${Wechat.oauthHandleUrl}?${querystring.stringify({code: Random.secret(), state: state})}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }, function (err, response, body) {
                if (err) {
                    assert.fail();
                } else {
                    try {
                        let lines = body.split(/\r?\n/).map(function (line) {
                            return line.trim();
                        }).filter(function (line) {
                            return /^\<div id\=\"config\"|\<script type/.test(line);
                        });

                        let config = JSON.parse(/\>(\{.+)\<\/div\>/.exec(lines[0])[1]);

                        assert.typeOf(config.credentialToken, 'string');
                        assert.typeOf(config.credentialSecret, 'string');
                    } catch (e) {
                        console.log(e.stack || e);
                        assert.fail(e || null, null);
                    }
                }
                done();
            });
        });

        it('credentialsLoginMiddlewares()', function (done) {
            request(WechatOAuth.proxyCredentialLoginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    credentialToken: 'credentialToken',
                    credentialSecret: 'credentialSecret'
                })
            }, function (err, response, body) {
                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
                assert.deepEqual(body, {
                    data: {
                        id: 'id',
                        token: 'token',
                        tokenExpires: 'tokenExpires',
                    }
                });
                done();
            });
        });

        describe('assets', function () {
            it('end_of_redirect_response.js', function (done) {
                request(`${WechatOAuth.assetsUrl}/end_of_redirect_response.js`, {
                    method: 'GET'
                }, function (err, response, body) {
                    eval(body);
                    let key = `${STORAGE_TOKEN_PREFIX}credentialToken`;
                    let credentialSecret = sessionStorage[key] || localStorage[key];
                    assert.equal(credentialSecret, 'credentialSecret');
                    assert.equal(window.location, 'redirectUrl');
                    done();
                });
            });
            it('end_of_popup_response.js', function (done) {
                request(`${WechatOAuth.assetsUrl}/end_of_popup_response.js`, {
                    method: 'GET'
                }, function (err, response, body) {
                    eval(body);
                    let key = `${STORAGE_TOKEN_PREFIX}credentialToken`;
                    let credentialSecret = sessionStorage[key] || localStorage[key];
                    assert.equal(credentialSecret, 'credentialSecret');
                    assert.equal(window.location, 'redirectUrl');
                    done();
                });
            });
        });
    });
});
