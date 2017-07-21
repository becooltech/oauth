/**
 * Created on 2017/5/16.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
var output = {
    STORAGE_USER_ID: 'Meteor.userId',
    STORAGE_LOGIN_TOKEN: 'Meteor.loginToken',
    STORAGE_TOKEN_EXPIRES: 'Meteor.loginTokenExpires',
    STORAGE_TOKEN_PREFIX: 'Meteor.oauth.credentialSecret-',
    RELOAD_KEY: 'Meteor_Reload',
    defaults: {
        /* oauth 客户端服务器的接口地址配置 */
        // oauth 客户端服务器的接口地址前缀
        rootPrefix: '/dora_oauth/2',
        // oauthHandleUri 为空时，则使用 rootPrefix 作为获取 code 后的跳转地址
        oauthHandleUri: '',
        proxyCredentialLoginUri: '/login',

        /* accounts server 接口地址配置 */
        credentialsServer: 'http://accounts.local',
        storeCredentialsUri: '/accounts/oauth/2',
        credentialLoginUri: '/accounts/users/login/credentials',
        assetsUri: '/assets'
    },
    getDefaultVal: function (key, val) {
        return val || output.defaults[key];
    }
};

module.exports = output;
