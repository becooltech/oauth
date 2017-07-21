/**
 * Created on 2017/5/22.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';

const http = require('http');
const assert = require('chai').assert;

let port = 9898;
let server = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({key: 'val'}));
});

describe('fetch()', function () {
    before('initialize', function (done) {
        server.listen(port, function () {
            console.log('server running on http://localhost:' + port);
            done();
        });
    });

    let method = it;
    if (typeof XMLHttpRequest === 'undefined') {
        console.log('fetch() exec will be skipped.');
        method = it.skip.bind(it);
    }

    method('exec', function (done) {
        require('../client/lib/fetch').polyfill('http://localhost:' + port, {
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'post',
            body: JSON.stringify({})
        })
            .then(function (res) {
                return res.json();
            })
            .then(function (res) {
                console.log(res);
                assert.deepEqual(res, {key: 'val'});
                done();
            })
            .catch(function (err) {
                assert.fail(err || null, err, 'fetch failed.');
                done();
            });
    });
});
