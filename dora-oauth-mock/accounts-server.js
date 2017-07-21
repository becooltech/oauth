/**
 * Created on 2017/7/20.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
const app = require('./server-factory')();
const URL = require('url');
const _ = require('lodash');

const stateFromQuery = function (query) {
    let string;
    try {
        string = new Buffer(query.state, 'base64').toString('binary');
    } catch (e) {
        console.warn('Unable to base64 decode state from OAuth query: ' + query.state);
        throw e;
    }

    try {
        return JSON.parse(string);
    } catch (e) {
        console.warn('Unable to parse state from OAuth query: ' + string);
        throw e;
    }
};

let routes = ({OAuthInstance}) => {
    const getUri = name => OAuthInstance[name].replace(OAuthInstance.rootUrl, '');
    let oauthHandleUrl = getUri('oauthHandleUrl');
    let proxyCredentialLoginUrl = getUri('proxyCredentialLoginUrl');

    app.post(oauthHandleUrl, (req, res) => {
        if (!req.body.serviceData) {
            return res.status(500).send(`expect 'body.serviceData'.`);
        }

        if (!req.body.serviceData.id) {
            return res.status(500).send(`expect 'body.serviceData.id'.`);
        }

        let urlObj = URL.parse(req.url, true);

        let state = stateFromQuery(urlObj.query);
        state.loginStyle = state.loginStyle || 'redirect';
        state.redirectUrl = state.redirectUrl || '/';
        state = _.omit(state, 'str');

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            credentialSecret: 'credentialSecret',
            state
        }));
        console.log('respond.');
    });

    app.post(proxyCredentialLoginUrl, (req, res) => {
        res.end(JSON.stringify({
            data: {
                id: 'id',
                token: 'token',
                tokenExpires: 'tokenExpires'
            }
        }));
    });

    app.all('*', function (req, res) {
        res.setHeader('Content-Type', 'application/json');
        console.log(_.pick(req, 'url', 'method', 'headers'));
        res.status(404).send(`[${req.method} - ${req.url}] not found.`);
    });
};

module.exports = (options, cb) => {
    let {port} = options;
    routes(options);

    app.listen(port, (...args) => {
        console.log(`Accounts server running on port ${port}.`);
        cb && cb(...args);
    });
};
