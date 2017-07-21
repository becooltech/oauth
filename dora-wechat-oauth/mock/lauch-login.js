/**
 * Created on 2017/7/20.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
const sinon = require('sinon');
const URL = require('url');

module.exports = (OAuth, request) => {
    let {_OAuthHelpers: OAuthHelpers, Random} = OAuth;

    return sinon.stub(OAuthHelpers, 'launchLogin').callsFake(function (options) {
        if (!options.loginService) {
            throw new Error('loginService required');
        }

        if (options.loginStyle === 'redirect') {
            OAuthHelpers.saveDataForRedirect(options.loginService, options.credentialToken);
        } else if (options.loginStyle !== 'popup') {
            throw new Error('invalid login style');
        }

        options.credentialRequestCompleteCallback.bind(null, options.credentialToken);
        return {
            options,
            call (cb) {
                let urlObj = URL.parse(options.loginUrl, true);
                let query = urlObj.query;
                let redirectUrlObj = URL.parse(query.redirect_uri);
                let _urlObj = {
                    protocol: redirectUrlObj.protocol,
                    host: redirectUrlObj.host,
                    pathname: redirectUrlObj.pathname,
                    query: {
                        code: Random.secret(),
                        state: query.state
                    }
                };
                let url = URL.format(_urlObj);

                request(url, {method: 'GET'}, cb);
            }
        };
    });
};
