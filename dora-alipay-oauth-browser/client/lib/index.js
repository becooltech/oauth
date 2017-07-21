/**
 * Created on 2017/5/15.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
var OAuth = require('dora-oauth-browser');

function AlipayOAuth (appId, options) {
    options = options || {};
    options.serviceName = 'alipay';
    OAuth.call(this, appId, options);
    var self = this;

    !options.loginLater && self.onPageLoadLogin();
}

OAuth.inherits(AlipayOAuth);

AlipayOAuth.prototype.encodeState = function (credentialToken, loginStyle, redirectUrl) {
    return this._callSuper('encodeState', {}, credentialToken, loginStyle, redirectUrl);
};

AlipayOAuth.prototype.authorizeURLBase = function () {
    return 'https://openauth.alipay.com/oauth2/publicAppAuthorize.htm';
};

AlipayOAuth.prototype.getAuthorizeURL = function (loginStyle, state, options) {
    options = options || {};
    return this._callSuper('getAuthorizeURL', loginStyle, state, {
        query: {
            app_id: this.appid,
            scope: options.scope || 'auth_userinfo',
            redirect_uri: this.oauthHandleUrl,
            state: state || ''
        }
    });
};

module.exports = AlipayOAuth;
