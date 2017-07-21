/**
 * Created on 2017/5/15.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
var Constants = require('../../lib/constants');
var Base64 = require('./../../lib/base64');
var Random = require('./../../lib/random');
var OAuthHelpers = require('./oauth-helpers');
var querystring = require('querystring');
var getDefaultVal = Constants.getDefaultVal;

var checkNull = function (key, val) {
    if ([null, undefined].indexOf(val) >= 0) {
        throw new Error('`' + key + '` should be set.');
    }
};

var fixUrl = function (ctx, name) {
    var url = ctx[name];
    if (!/(https?:)\/\//.test(url)) {
        url = '/' + url;
    }
    return url.replace(/^\/+/, '/').replace(/\/$/g, '');
};

function OAuth (appId, options) {
    var self = this;
    self.serviceName = options.serviceName;
    checkNull('options.serviceName', self.serviceName);
    self.appid = appId;
    self.rootUrl = options.rootUrl.replace(/\/$/, '');
    checkNull('options.rootUrl', self.rootUrl);

    self.rootPrefix = getDefaultVal('rootPrefix', options.rootPrefix) + '/' + this.serviceName;
    options.oauthHandleUri = getDefaultVal('oauthHandleUri', options.oauthHandleUri);

    ['rootPrefix'].forEach(function (field) {
        self[field] = fixUrl(self, field);
    });
    self.rootPrefix = self.rootUrl + self.rootPrefix;
    ['oauthHandleUri'].forEach(function (field) {
        options[field] = fixUrl(options, field);
    });
    self.oauthHandleUrl = self.rootPrefix + options.oauthHandleUri;
    self.proxyCredentialLoginUrl = self.rootPrefix + getDefaultVal('proxyCredentialLoginUri');
    self._loggingIn = false;

    self.onLoginStatusSwitchCallbacks = {true: [], false: []};
    var onPageLoadLoginCallback = options.onPageLoadLoginCallback;
    self.onPageLoadLoginCallback = function (err, res) {
        self.onPageLoadLoginCallback = null;
        onPageLoadLoginCallback && onPageLoadLoginCallback.call(self, err, res);
    };
}

OAuth.makeClientLoggedIn = function (data) {
    localStorage[Constants.STORAGE_USER_ID] = data.id;
    localStorage[Constants.STORAGE_LOGIN_TOKEN] = data.token;
    localStorage[Constants.STORAGE_TOKEN_EXPIRES] = data.tokenExpires;
};

OAuth.isMobile = function () {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
};

OAuth._loginStyle = function (loginStyle) {
    return loginStyle || (OAuth.isMobile() && 'redirect' || 'popup');
};

OAuth.prototype._getDataAfterRedirect = function () {
    return OAuthHelpers.getDataAfterRedirect(this.serviceName);
};

OAuth.prototype.onPageLoadLogin = function () {
    var oauth = this._getDataAfterRedirect();
    if (oauth && oauth.credentialToken && oauth.credentialSecret) {
        return this.loginWithCredentials(oauth.credentialToken,
            oauth.credentialSecret,
            this.onPageLoadLoginCallback);
    }
    return this.onPageLoadLoginCallback();
};

OAuth.prototype.onLoggingIn = function (callbacks) {
    if (typeof callbacks === 'function') {
        callbacks = [callbacks];
    }
    var self = this;
    callbacks.forEach(function (callback) {
        self.onLoginStatusSwitchCallbacks.true.push(callback);
    });
};

OAuth.prototype.onLoginFinished = function (callbacks) {
    if (typeof callbacks === 'function') {
        callbacks = [callbacks];
    }
    var self = this;
    callbacks.forEach(function (callback) {
        self.onLoginStatusSwitchCallbacks.false.push(callback);
    });
};

OAuth.prototype.loggingIn = function () {
    return this._loggingIn;
};

OAuth.prototype.setLoggingIn = function (flag) {
    var self = this;
    self._loggingIn = !!flag;

    // 仅执行一次
    var callbacks = self.onLoginStatusSwitchCallbacks[self._loggingIn];
    while (callbacks.length) {
        callbacks.shift().call(self);
    }
};

OAuth.prototype._callSuper = function () {
    var Super = this.constructor.super_;
    var args = Array.prototype.slice.call(arguments, 0);
    var method = args.shift();
    if (!method) {
        throw new Error('First argument should be a method name on super class.');
    }
    if (!Super) {
        throw new Error('Class `' + this.constructor.name + '` is not inherited by `OAuth.inherits()`.\n' +
                        'If you extend super class with ES6, please call `super.' + method + '()` instead.');
    }
    return Super.prototype[method].apply(this, args);
};

OAuth.prototype.encodeState = function (state, credentialToken, loginStyle, redirectUrl) {
    state = state || {};
    state.loginStyle = loginStyle || state.loginStyle || undefined;
    state.credentialToken = credentialToken || state.credentialToken;
    state.redirectUrl = redirectUrl || state.redirectUrl;

    return Base64.encode(JSON.stringify(state));
};

OAuth.formatHash = function (hash) {
    if (hash) {
        if (hash === '#') {
            return '';
        }
        if (/^#/.test(hash)) {
            return hash;
        }
        return '#' + hash;
    }
    return '';
};

OAuth.prototype.getAuthorizeURL = function (loginStyle, state, options) {
    var url = this.authorizeURLBase(loginStyle);
    return url + '?' + querystring.stringify(options.query) + OAuth.formatHash(options.hash);
};

OAuth.prototype.wrapPopupClosedCallback = function (cb) {
    return OAuthHelpers.wrapPopupClosedCallback(this, cb);
};

/**
 * 根据登录方式返回不同的授权地址
 * @param loginStyle {string}
 */
OAuth.prototype.authorizeURLBase = function (loginStyle) {
    throw new Error('method `authorizeURLBase` is not implemented yet.');
};

OAuth.prototype.getCredentialToken = function (len) {
    return Random.secret(len);
};

OAuth.prototype.login = function (options, callback) {
    if (typeof options === 'function' && !callback) {
        callback = options;
        options = {};
    }

    if (options.loginStyle && ['redirect', 'popup'].indexOf(options.loginStyle) < 0) {
        return callback(new Error('Invalid loginStyle: ' + options.loginStyle));
    }

    var credentialToken = this.getCredentialToken();
    var state = this.encodeState(credentialToken, options.loginStyle, options.redirectUrl || '/');
    return OAuthHelpers.launchLogin({
        loginService: this.serviceName,
        loginStyle: options.loginStyle,
        //url, state, responseType, scope, hash
        loginUrl: this.getAuthorizeURL(options.loginStyle, state, options),
        credentialRequestCompleteCallback: this.wrapPopupClosedCallback(callback),
        credentialToken: credentialToken
    });
};

OAuth.prototype.loginWithCredentials = function (credentialToken, credentialSecret, callback) {
    var self = this;
    var onLoginFin = function (err, res) {
        self.setLoggingIn(false);
        if (res && res.data && res.data.id && res.data.token) {
            res = res.data;
        }
        if (!err && !res && Constants.STORAGE_LOGIN_TOKEN) {
            res = {};
            res.id = localStorage[Constants.STORAGE_USER_ID];
            res.token = localStorage[Constants.STORAGE_LOGIN_TOKEN];
            res.tokenExpires = localStorage[Constants.STORAGE_TOKEN_EXPIRES];
            if (res.tokenExpires && new Date(res.tokenExpires).getTime() < Date.now()) {
                res = null;
            }
        }
        callback && callback(err, res);
    };
    var login = function () {
        self.setLoggingIn(true);
        return require('./fetch')(self.proxyCredentialLoginUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({credentialToken: credentialToken, credentialSecret: credentialSecret})
        }).then(function (res) {
            return res.json();
        }).then(function (json) {
            if (typeof json === 'string') {
                json = JSON.parse(json);
            }
            if (!json || !json.data || !json.data.id) {
                onLoginFin(json);
                if (!callback) {
                    throw json;
                }
            }

            OAuth.makeClientLoggedIn(json.data);
            onLoginFin(null, json);
            return json;
        }).catch(function (err) {
            onLoginFin(err);
            if (!callback) {
                throw err;
            }
        });
    };

    // 如果正在执行其他登录，则等待其完成，仅在未发生跳转的前提下生效
    if (self.loggingIn()) {
        return new Promise(function (resolve, reject) {
          return self.onLoginFinished(function () {
            var p = login();
            resolve(p);
            return p;
          });
        });
    }
    return login();
};

var setPrototypeOf = Object.setPrototypeOf ?
                     function (obj, proto) {
                         return Object.setPrototypeOf(obj, proto);
                     } :
                     // Only works in Chrome and FireFox, does not work in IE:
                     function (obj, proto) {
                         obj.__proto__ = proto;
                         return obj;
                     };

var inherits = function (ctor, superCtor) {
    if (ctor === undefined || ctor === null)
        throw new TypeError('The constructor to "inherits" must not be ' +
                            'null or undefined');

    if (superCtor === undefined || superCtor === null)
        throw new TypeError('The super constructor to "inherits" must not ' +
                            'be null or undefined');

    if (superCtor.prototype === undefined)
        throw new TypeError('The super constructor to "inherits" must ' +
                            'have a prototype');

    ctor.super_ = superCtor;
    setPrototypeOf(ctor.prototype, superCtor.prototype);
};

OAuth.inherits = function (ctor, superCtor) {
    superCtor = superCtor || OAuth;
    return inherits(ctor, superCtor);
};

// 弹窗方式的登录完成后，服务端渲染的脚本会检查并执行该 API
window.DoraOAuth = OAuth;
OAuth._handleCredentialSecret = OAuthHelpers._handleCredentialSecret;
OAuth.Constants = Constants;
OAuth.Base64 = Base64;
OAuth.Random = Random;
OAuth._OAuthHelpers = OAuthHelpers;
OAuth.fixUrl = fixUrl;

module.exports = OAuth;
