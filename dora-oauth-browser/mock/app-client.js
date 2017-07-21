/**
 * Created on 2017/5/16.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
require('dora-oauth-utils/lib/server-atob');
let CONSTANTS;

try {
    CONSTANTS = require('dora-oauth-browser/lib/constants');
} catch (e) {
    CONSTANTS = require('../lib/constants');
}

let apis = {};
const STORAGE_TOKEN_PREFIX = CONSTANTS.STORAGE_TOKEN_PREFIX;

apis.window = function () {
    let close = function () {};
    if (typeof window === 'undefined') {
        global.window = {close};
    } else {
        global.window.close = close;
    }
};
let registerGlobal = function (name, val) {
    apis.window();
    window[name] = global[name] = val;
};

apis.navigator = function () {
    registerGlobal('navigator', {userAgent: 'Android'});
};

apis.storage = function () {
    if (typeof global === 'undefined') {
        return;
    }

    let initializeStorage = function (name) {
        return registerGlobal(name, {
            get length () {
                return Object.keys(window[name]).length;
            },
            clear () {
                initializeStorage(name);
            },
            setItem (key, data) {
                window[name][key] = data ? data.toString() : (data + '');
            },
            getItem (key) {
                return window[name][key] || null;
            },
            removeItem (key) {
                delete window[name][key];
            },
            key (i) {
                return Object.keys(window[name])[i];
            }
        });
    };
    initializeStorage('sessionStorage');
    initializeStorage('localStorage');
};

apis.fetch = function () {
    if (typeof global === 'undefined') {
        return;
    }
    if (typeof fetch === 'undefined') {
        const request = require('request');
        registerGlobal('fetch', function (url, options) {
            return new Promise(function (resolve, reject) {
                request(url, options, function (err, response, body) {
                    if (err) {
                        return reject(err);
                    }
                    resolve({
                        json: function () {
                            return new Promise(function (resolve, reject) {
                                if (typeof body === 'string') {
                                    try {
                                        body = JSON.parse(body);
                                    } catch (e) {
                                        return reject(e);
                                    }
                                    return resolve(body);
                                }
                                resolve(body);
                            });
                        }
                    });
                });
            });
        });
    }
};

apis.document = function (val) {
    registerGlobal('document', {
        getElementById (id) {
            if (id === 'config') {
                let config = val || {
                    setCredentialToken: true,
                    credentialToken: 'credentialToken',
                    credentialSecret: 'credentialSecret',
                    storagePrefix: STORAGE_TOKEN_PREFIX,
                    redirectUrl: 'redirectUrl'
                };
                return {
                    innerHTML: JSON.stringify(config)
                };
            }

            if (id === 'completedText') {
                return {
                    style: {
                        display: val || 'block'
                    }
                };
            }

            if (id === 'loginCompleted') {
                return {
                    onclick: val || function () {
                        window.close();
                    }
                };
            }
        }
    });
};

let output = {
    all () {
        Object.keys(apis).forEach(function (key) {
            let api = apis[key];
            if (typeof api === 'function') {
                api();
            }
        });
    }
};
module.exports = Object.assign(output, apis);
