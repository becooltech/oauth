/**
 * Created on 2017/5/24.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
const client = require('../mock/app-client');
const OAuth = require('../client/lib');
const URL = require('url');
const assert = require('chai').assert;
const qs = require('querystring');

describe('OAuth', function () {
    let Service;
    before('initialize', function () {
        Service = new OAuth('appid', {
            serviceName: 'service',
            rootUrl: 'http://localhost:9000'
        });
        Service.authorizeURLBase = function (loginStyle) {
            return 'http://' + loginStyle + '.test/pathname';
        };
        client.window();
    });

    it('#getAuthorizeURL()', function () {
        let credentialToken = OAuth.Random.secret();
        let loginStyle = 'redirect';
        let redirectUrl = '/';
        let state = Service.encodeState(null, credentialToken, loginStyle, redirectUrl);
        let queryObj = {
            appid: 'appid',
            redirect_uri: 'http://localhost:9000/dora_oauth/2/service',
            response_type: 'code',
            scope: 'snsapi_userinfo',
            state: state
        };
        let url = Service.getAuthorizeURL(loginStyle, state, {
            query: queryObj,
            hash: 'service_redirect'
        });
        let obj = URL.parse(url);
        let query = qs.parse(obj.query);
        assert.equal(obj.protocol, 'http:');
        assert.equal(obj.host, 'redirect.test');
        assert.equal(obj.hash, '#service_redirect');
        assert.equal(obj.pathname, '/pathname');
        assert.deepEqual(query, queryObj);
    });
});
