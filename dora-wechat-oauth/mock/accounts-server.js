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
    const getUri = name => URL.parse(OAuthInstance[name]).pathname;
    let storeCredentialsUrl = getUri('storeCredentialsUrl');
    let credentialLoginUrl = getUri('credentialLoginUrl');

    app.post(storeCredentialsUrl, (req, res) => {
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

    app.post(credentialLoginUrl, (req, res) => {
        console.log(req.body);
        res.end(JSON.stringify({
            data: {
                id: 'id',
                token: 'token',
                tokenExpires: 'tokenExpires'
            }
        }));
    });

    let configs = {};
    let getConfig = (service, env) => {
        if (env) {
            return configs[service] && configs[service][env];
        }
        return configs[service];
    };

    let addConfig = (service, config, env) => {
        configs[service] = configs[service] || {};
        if (env) {
            configs[service] = config;
        } else {
            configs[service][env] = config;
        }
        return true;
    };

    let delConfig = (service, env) => {
        if (configs[service]) {
            if (env) {
                return delete configs[service][env];
            }
            configs[service] = [];
        }
        return false;
    };

    let accountsConfigUrlPrefix = `${getUri('storeCredentialsUrl')}/configs`;
    app.get(`${accountsConfigUrlPrefix}/:env`, (req, res) => {
        res.end(JSON.stringify({result: getConfig(OAuthInstance.serviceName, req.params.env)}));
    });
    app.get(accountsConfigUrlPrefix, (req, res) => {
        res.end(JSON.stringify({result: getConfig(OAuthInstance.serviceName, req.params.env)}));
    });

    app.post(`${accountsConfigUrlPrefix}/:env`, (req, res) => {
        res.end(JSON.stringify({result: addConfig(OAuthInstance.serviceName, req.body.config, req.params.env)}));
    });
    app.post(accountsConfigUrlPrefix, (req, res) => {
        res.end(JSON.stringify({result: addConfig(OAuthInstance.serviceName, req.body.config, req.params.env)}));
    });

    app.delete(`${accountsConfigUrlPrefix}/:env`, (req, res) => {
        res.end(JSON.stringify({result: delConfig(OAuthInstance.serviceName, req.params.env)}));
    });
    app.delete(accountsConfigUrlPrefix, (req, res) => {
        res.end(JSON.stringify({result: delConfig(OAuthInstance.serviceName, req.params.env)}));
    });

    app.use((err, req, res, next) => {
        console.log();
        res.status(500).send(err.stack);
    });

    app.all('*', function (req, res) {
        console.log(OAuthInstance)
        res.setHeader('Content-Type', 'application/json');
        console.log(_.pick(req, 'url', 'method', 'headers', 'body'));
        console.trace(`404: ${req.method}, ${req.url}`);
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
