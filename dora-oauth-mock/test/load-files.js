/**
 * Created on 2017/7/21.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
const assert = require('chai').assert;

describe('mocks', () =>
    it('load-files', () => {
        require('../accounts-server');
        require('../app-client');
        require('../app-server');
        require('../lauch-login');
        require('../server-factory');
        assert.isOk(true);
    })
);
