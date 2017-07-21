/**
 * Created on 2017/5/15.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
const URL = require('url');
const getDefaultVal = require('../../lib/constants').getDefaultVal;
const _WechatOAuth = require('wechat-oauth');
const request = require('request');
const querystring = require('querystring');
const Assets = require('../../lib/assets');
const Router = require('./../../lib/router');
const CONSTANTS = require('../../lib/constants');

const STORAGE_TOKEN_PREFIX = CONSTANTS.STORAGE_TOKEN_PREFIX;

let createRoute = function (url, method, handler) {
    if (typeof method === 'function') {
        handler = method;
        method = 'get';
    }
    return Router.route(url, {
        method: method,
        action: handler
    });
};

let makeAccessTokenCompatible = function (data) {
    if (!data || !data.access_token) {
        return;
    }
    let _data = {};
    _data.expires_in = _data.expiresIn = data.expires_in || data.expiresIn || 7200;
    let createdAt = new Date(
        data.create_at || data.createdAt || ((data.expireAt || 0) - (_data.expires_in * 1000))
    );

    _data.access_token = _data.accessToken = data.access_token || data.accessToken;
    _data.refresh_token = _data.refreshToken = data.refresh_token || data.refreshToken;
    _data.create_at = _data.createdAt = createdAt;
    _data.expireAt = new Date(createdAt.getTime() + _data.expires_in * 1000);
    _data.openid = data.openid;

    return _data;
};

let makeApiTokenCompatible = function (data) {
    let _data = {};
};

let instanceMap = {};

let fixUrl = function (ctx, name) {
    let url = ctx[name];
    if (!/(https?\:)\/\//.test(url)) {
        url = '/' + url;
    }
    return url.replace(/^\/+/, '/').replace(/\/$/g, '');
};

// hack #request()
_WechatOAuth.prototype.rawRequest = _WechatOAuth.prototype.request;
_WechatOAuth.prototype.request = function (url, opts, callback) {
    let options = {};
    Object.assign(options, this.defaults);
    if (typeof opts === 'function') {
        callback = opts;
        opts = {};
    }
    Object.keys(opts).forEach(function (key) {
        if (key !== 'headers') {
            options[key] = opts[key];
        } else if (opts.headers) {
            options.headers = options.headers || {};
            Object.assign(options.headers, opts.headers);
        }
    });

    let query = querystring.stringify(options.data || '');
    let search = query && `?${query}` || '';
    let _options = {};
    Object.keys(options).forEach(function (key) {
        if (['data', 'dataType'].indexOf(key) >= 0) {
            return;
        }
        _options[key] = options[key];
    });
    _options.method = _options.method || 'GET';

    let self = this;

    if (self.LOG) {
        self.LOG(`${url}${search}`, JSON.stringify(_options));
    }

    request(`${url}${search}`, _options, function (err, response, body) {
        if (typeof err === 'string') {
            try {
                err = JSON.parse(err);
            } catch (e) {
                // do nothing
                self.LOG && self.LOG(e);
            }
        }
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }
        if (self.LOG) {
            self.LOG('got response:', body);
        }
        callback(err, body, response);
    });
};

let makeGetTokenCompatible = (ctx, fn) =>
    ctx.getToken = fn && function () {
        let accessToken = fn.apply(this, arguments);
        return makeAccessTokenCompatible(accessToken);
    };

let makeSaveTokenCompatible = (ctx, fn) =>
    ctx.saveAccessToken = fn && function (openid, accessToken, callback) {
        accessToken = makeAccessTokenCompatible(accessToken);
        return fn.apply(this, openid, accessToken, callback);
    };

class WechatOAuth extends _WechatOAuth {
    constructor (appId, secret, options) {
        super(appId, secret, options.getToken, options.saveToken);
        let self = this;
        makeGetTokenCompatible(self, self.getToken);
        makeSaveTokenCompatible(self, self.saveAccessToken);

        if (process.env.NODE_ENV === 'development') {
            self._debug = WechatOAuth._debug = true;
        } else {
            self._debug = options.debugOn;
        }

        self.LOG = self.WARN = self.ERROR = function () {};
        ['log', 'warn', 'error'].forEach(lv => self[lv.toUpperCase()] = function () {
            if (self._debug) {
                console[lv].bind(console, new Date()).apply(console, arguments);
            }
        });
        self.serviceName = 'wechat';

        self.resultHandler = options.resultHandler;

        self.rootPrefix = getDefaultVal('rootPrefix', options.rootPrefix);
        if (!options.rootUrl) {
            throw new Error('`options.rootUrl` should be set.');
        }

        let rootUrlObj = URL.parse(options.rootUrl);
        self.rootUrl = URL.format({
            host: rootUrlObj.host,
            protocol: rootUrlObj.protocol,
            pathname: rootUrlObj.pathname.replace(/\/$/, '')
        });
        self.rootUrlObj = rootUrlObj;

        self.credentialsServer = getDefaultVal('credentialsServer', options.credentialsServer);

        ['rootUrl', 'rootPrefix', 'credentialsServer'].forEach(function (field) {
            self[field] = fixUrl(self, field);
        });

        self.rootPrefix = self.absoluteUrl(self.rootPrefix);

        options.oauthHandleUri = getDefaultVal('oauthHandleUri', options.oauthHandleUri);
        options.storeCredentialsUri = getDefaultVal('storeCredentialsUri', options.storeCredentialsUri);
        options.credentialLoginUri = getDefaultVal('credentialLoginUri', options.credentialLoginUri);

        ['oauthHandleUri', 'storeCredentialsUri', 'credentialLoginUri'].forEach(function (field) {
            options[field] = fixUrl(options, field);
        });

        self.oauthHandleUrl = self.rootPrefix + options.oauthHandleUri;
        self.proxyCredentialLoginUrl = self.rootPrefix + getDefaultVal('proxyCredentialLoginUri');

        self.storeCredentialsUrl = self.credentialsServer + options.storeCredentialsUri;
        self.credentialLoginUrl = self.credentialsServer + options.credentialLoginUri;

        ['oauthHandleUrl', 'storeCredentialsUrl', 'credentialLoginUrl'].forEach(function (field) {
            self[field] = fixUrl(self, field);
        });
        self.assetsUri = Assets.replaceRootUrlPrefix(getDefaultVal('rootPrefix'));
        WechatOAuth.assetsUrl = self.absoluteUrl(self.assetsUri);

        instanceMap[appId] = self;
        WechatOAuth.oauthHandleUrl = self.oauthHandleUrl;
        WechatOAuth.proxyCredentialLoginUrl = self.proxyCredentialLoginUrl;
        WechatOAuth.credentialLoginUrl = self.credentialLoginUrl;
        WechatOAuth._initMiddlewares();
    }

    refreshAccessToken (refreshToken, callback) {
        let self = this;
        super.refreshAccessToken(refreshToken, function (err, res) {
            let accessToken = res.data = makeAccessTokenCompatible(res.data);
            callback && callback(err, res);

            accessToken &&
            accessToken.openid &&
            self.saveAccessToken &&
            self.saveAccessToken(accessToken.openid, accessToken);
        });
    }

    getAccessTokenObj (code, cb) {
        let self = this;
        self.LOG('-- request access token');
        self.LOG({
            code,
            appId: self.appid
        });

        let callback = function (err, res) {
            self.LOG('super.getAccessToken() executed.');
            self.LOG(err, res);
            if (err) {
                return cb(err);
            }

            let accessToken = makeAccessTokenCompatible(res.data);
            accessToken.lang = accessToken.lang || 'zh_CN';
            cb(null, accessToken);
        };

        try {
            super.getAccessToken(code, callback);
        } catch (e) {
            self.ERROR(e.stack || e);
        }
    }

    getUserInfoByCode (code, cb) {
        let self = this;
        self.getAccessTokenObj(code, function (err, accessToken) {
            if (err) {
                return cb(err);
            }
            self._getUser({
                openid: accessToken.openid,
                lang: accessToken.lang || 'zh_CN'
            }, accessToken.access_token, function (err, res) {
                if (err) {
                    return cb(err);
                }
                cb(null, {serviceData: res, accessToken});
            });
        });
    }

    static resultHandler () {
        throw new Error('Static method `WechatOAuth.resultHandler()` is not implemented yet.');
    }

    createCredentials (query, cb) {
        let self = this;
        let resultHandler = function (data) {
            data.serviceData.id = data.serviceData.unionid;
            let handler = self.resultHandler || WechatOAuth.resultHandler;
            handler && handler.call(self, data);
        };
        self.getUserInfoByCode(query.code, function (err, user) {
            if (err) {
                return cb(err);
            }

            let data = resultHandler(user) || user;
            let url = `${self.storeCredentialsUrl}?${querystring.stringify({state: query.state})}`;
            self.LOG('-- store credentials');
            self.LOG(url);
            self.LOG(JSON.stringify(data));

            request.post(url, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }, function (error, response, body) {
                if (error) {
                    return cb(error);
                }

                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
                if (body.errorType) {
                    error = body;
                    body = {state: {}};
                }

                cb(error, body);
            });
        });
    }

    static getTemplate (loginStyle, configs) {
        return Assets.getTemplate(loginStyle, configs);
    }

    absoluteUrl (uri) {
        let urlObj = URL.parse(uri || '');
        return URL.format({
            host: this.rootUrlObj.host,
            protocol: this.rootUrlObj.protocol,
            pathname: this.rootUrlObj.pathname.replace(/\/$/, '') + (urlObj.pathname || ''),
            search: urlObj.search
        });
    }

    static oauthHandler () {
        return createRoute(WechatOAuth.oauthHandleUrl, function (req, res, next) {
            let query = req.query;
            let self = WechatOAuth.chooseInstance(req);
            self.LOG('== handing oauth requests.');
            self.createCredentials(query, function (err, body) {
                self.LOG(`[${req.method.toUpperCase()} - ${req.url}]`);
                self.LOG(req.headers);
                if (err) {
                    self.ERROR('error occurred when calling into WechatOAuth#createCredentials():', err.stack || err);
                    self.LOG('== oauth requests handing done.');
                    return res.end(JSON.stringify(err));
                }
                let redirectUrl = self.absoluteUrl(body.state.redirectUrl);
                let configs = {
                    setCredentialToken: !!(body.state.credentialToken && body.credentialSecret),
                    credentialToken: body.state.credentialToken,
                    credentialSecret: body.credentialSecret,
                    storagePrefix: self.storageTokenPrefix || STORAGE_TOKEN_PREFIX,
                    redirectUrl
                };
                let template = WechatOAuth.getTemplate(body.state.loginStyle, configs);

                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(template);
                self.LOG('== handing oauth requests done.');
            });
        });
    }

    static loginWithCredentials (credentialToken, credentialSecret, cb) {
        let data = {
            credentialToken: credentialToken,
            credentialSecret: credentialSecret
        };
        request.post(WechatOAuth.credentialLoginUrl, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }, function (err, response, body) {
            if (typeof body === 'string') {
                body = JSON.parse(body);
            }
            cb(err, body);
        });
    }

    static credentialsLoginMiddlewares () {
        return createRoute(WechatOAuth.proxyCredentialLoginUrl, 'post', function (req, res, next) {
            let pipe;
            if (req.body) {
                let body = req.body;
                console.log(body);
                if (typeof body !== 'string') {
                    body = JSON.stringify(body);
                }
                pipe = request.post(WechatOAuth.credentialLoginUrl, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: body
                });
            } else {
                pipe = req.pipe(request(WechatOAuth.credentialLoginUrl));
            }

            pipe.on('data',function (chunk) {
                res.write(chunk);
            });

            pipe.on('end',function () {
                res.end();
            });
        });
    }

    static getInstance (appId, secret, options) {
        if (instanceMap[appId]) {
            return instanceMap[appId];
        }
        return new WechatOAuth(appId, secret, options);
    }

    static chooseInstance () {
        throw new Error('Static method `WechatOAuth.chooseInstance()` is not implemented yet.');
    }

    static _initMiddlewares () {
        WechatOAuth.middlewares = WechatOAuth.middlewares || [
            Assets.middleware(),
            WechatOAuth.oauthHandler(),
            WechatOAuth.credentialsLoginMiddlewares()
        ];
    }
}

WechatOAuth._parent = _WechatOAuth;
WechatOAuth._request = request;
WechatOAuth._assets = Assets.assets;

module.exports = WechatOAuth;
