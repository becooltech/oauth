/**
 * Created on 2017/4/1.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';

var CONSTANTS = require('../../lib/constants');

var STORAGE_TOKEN_PREFIX = CONSTANTS.STORAGE_TOKEN_PREFIX,
    RELOAD_KEY = CONSTANTS.RELOAD_KEY;

var store = function (data) {
    sessionStorage[RELOAD_KEY] = JSON.stringify(data);
};
var retrieve = function (name, service, keep) {
    var data = sessionStorage[RELOAD_KEY];
    if (data) {
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = {};
        }
        if (data.oauth && data.oauth.loginService && data.oauth.loginService === service) {
            !keep && sessionStorage.removeItem(RELOAD_KEY);
            return data[name];
        }
    }
    return null;
};

var saveDataForRedirect = function (loginService, credentialToken) {
    store({
        oauth: {
            loginService: loginService,
            credentialToken: credentialToken
        },
        reload: true
    });
};

var getDataAfterRedirect = function (service, keep) {
    var migrationData = retrieve('oauth', service, keep) || {};

    if (!(migrationData && migrationData.credentialToken)) {
        return null;
    }

    var credentialToken = migrationData.credentialToken;
    var key = STORAGE_TOKEN_PREFIX + credentialToken;
    var credentialSecret;
    try {
        credentialSecret = sessionStorage[key];
        sessionStorage.removeItem(key);
    } catch (e) {
        credentialSecret = null;
    }
    return {
        loginService: migrationData.loginService,
        credentialToken: credentialToken,
        credentialSecret: credentialSecret
    };
};

module.exports = {
    store: store,
    retrieve: retrieve,
    saveDataForRedirect: saveDataForRedirect,
    getDataAfterRedirect: getDataAfterRedirect
};
