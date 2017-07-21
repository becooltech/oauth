/**
 * Created on 2017/5/16.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';

var Reload = require('./reload');
var STORAGE_TOKEN_PREFIX = require('../../lib/constants').STORAGE_TOKEN_PREFIX;

var credentialSecrets = {};

var openCenteredPopup = function (url, width, height) {
    var screenX = typeof window.screenX !== 'undefined'
        ? window.screenX : window.screenLeft;
    var screenY = typeof window.screenY !== 'undefined'
        ? window.screenY : window.screenTop;
    var outerWidth = typeof window.outerWidth !== 'undefined'
        ? window.outerWidth : document.body.clientWidth;
    var outerHeight = typeof window.outerHeight !== 'undefined'
        ? window.outerHeight : (document.body.clientHeight - 22);

    var left = screenX + (outerWidth - width) / 2;
    var top = screenY + (outerHeight - height) / 2;
    var features = ('width=' + width + ',height=' + height +
                    ',left=' + left + ',top=' + top + ',scrollbars=yes');

    var newwindow = window.open(url, 'Login', features);

    if (typeof newwindow === 'undefined') {
        var err = new Error('The login popup was blocked by the browser');
        err.attemptedUrl = url;
        throw err;
    }

    if (newwindow.focus)
        newwindow.focus();

    return newwindow;
};

var oauthHelpers = {
    _storageTokenPrefix: STORAGE_TOKEN_PREFIX,
    _handleCredentialSecret: function (credentialToken, secret) {
        if (!credentialSecrets.hasOwnProperty(credentialToken)) {
            credentialSecrets[credentialToken] = secret;
        } else {
            throw new Error('Duplicate credential token from OAuth login');
        }
    },
    _retrieveCredentialSecret: function (credentialToken) {
        var secret = credentialSecrets[credentialToken];
        if (!secret) {
            var localStorageKey = oauthHelpers._storageTokenPrefix + credentialToken;
            secret = localStorage[localStorageKey];
            localStorage.removeItem(localStorageKey);
        } else {
            delete credentialSecrets[credentialToken];
        }
        return secret;
    },
    wrapPopupClosedCallback: function (oauth, callback) {
        return function (credentialTokenOrError) {
            if (credentialTokenOrError && credentialTokenOrError instanceof Error) {
                callback && callback(credentialTokenOrError);
            } else {
                var credentialSecret = oauthHelpers._retrieveCredentialSecret(credentialTokenOrError) || null;
                oauth.loginWithCredentials(credentialTokenOrError, credentialSecret, callback);
            }
        };
    },
    showPopup: function (url, callback, dimensions) {
        var popup = openCenteredPopup(
            url,
            (dimensions && dimensions.width) || 650,
            (dimensions && dimensions.height) || 331
        );

        var checkPopupOpen = setInterval(function () {
            var popupClosed;
            try {
                popupClosed = popup.closed || popup.closed === undefined;
            } catch (e) {
                return;
            }

            if (popupClosed) {
                clearInterval(checkPopupOpen);
                callback();
            }
        }, 100);
    },
    getDataAfterRedirect: Reload.getDataAfterRedirect,
    saveDataForRedirect: Reload.saveDataForRedirect,
    launchLogin: function (options) {
        if (!options.loginService) {
            throw new Error('loginService required');
        }
        if (options.loginStyle === 'popup') {
            oauthHelpers.showPopup(
                options.loginUrl,
                options.credentialRequestCompleteCallback.bind(null, options.credentialToken),
                options.popupOptions);
        } else {
            oauthHelpers.saveDataForRedirect(options.loginService, options.credentialToken);
            window.location = options.loginUrl;
        }
    }
};

module.exports = oauthHelpers;
