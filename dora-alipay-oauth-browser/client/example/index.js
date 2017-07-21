var AlipayOAuth = require('dora-alipay-oauth-browser');

var port = 9999;
var rootUrl = 'http://localhost:' + port;
var loginOpts = {
    scope: 'snsapi_userinfo',
    redirectUrl: '/'
};

var Alipay = new AlipayOAuth('APPID', {
    rootUrl,
    rootPrefix: 'test_oauth/2',
    loginLater: true, //如果设置为 true, 则需要自行调用 #onPageLoadLogin() 来执行加载时判定和执行登录的行为
    onPageLoadLoginCallback: function (err, userInfo) { // 调用 #onPageLoadLogin() 完成后执行
        alert(JSON.stringify(userInfo || ''));
        if (userInfo && userInfo.data && userInfo.msg) {
            userInfo = userInfo.data;
        }

        var self = this;

        if (userInfo) { // 登录成功
            localStorage.removeItem('Meteor.loginTriedCount');
        } else { // 登录失败或尚未登录
            localStorage['Meteor.loginTriedCount'] = localStorage['Meteor.loginTriedCount'] || 0;
            if (!localStorage['Meteor.loginTriedCount']) {
                localStorage['Meteor.loginTriedCount']++;
                self.login(loginOpts);
            } else {
                localStorage['Meteor.loginTriedCount']++;
                // 如果失败，则十秒后再试一次
                setTimeout(function () {
                    self.login(loginOpts);
                }, 10 * 1000);
            }
        }
    }
});

var loginStyle = 'redirect';
var credentialToken = Alipay.getCredentialToken();
var state = Alipay.encodeState(credentialToken, loginStyle);

// 检查 url 是否正确
var url = Alipay.getAuthorizeURL(loginStyle, state);
console.log(url);

// 必须在代码加载阶段执行，用于检查本地是否已存储登录凭据
Alipay.onPageLoadLogin();
