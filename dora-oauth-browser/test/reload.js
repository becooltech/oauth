/**
 * Created on 2017/5/17.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';

const client = require('../mock/app-client');
const Reload = require('../client/lib/reload');
const CONSTANTS = require('../lib/constants');
const assert = require('chai').assert;

describe('Reload', function () {
    before('initialize', function () {
        client.storage();
    });

    it('saveDataForRedirect()', function () {
        let data = {
            loginService: 'wechat',
            credentialToken: 'credentialToken'
        };
        Reload.saveDataForRedirect(data.loginService, data.credentialToken);
        let saved = JSON.parse(sessionStorage[CONSTANTS.RELOAD_KEY]);
        sessionStorage.clear();
        assert.deepEqual(saved, {
            oauth: data,
            reload: true
        });
    });

    it('getDataAfterRedirect()', function () {
        let data = {
            loginService: 'wechat',
            credentialToken: 'credentialToken'
        };
        Reload.saveDataForRedirect(data.loginService, data.credentialToken);
        let saved = Reload.getDataAfterRedirect('wechat');
        saved.credentialSecret = saved.credentialSecret || null;
        assert.deepEqual(saved, {
            loginService: 'wechat',
            credentialToken: 'credentialToken',
            credentialSecret: null
        });
        assert.equal(sessionStorage[CONSTANTS.RELOAD_KEY] || null, null);
    });
});
