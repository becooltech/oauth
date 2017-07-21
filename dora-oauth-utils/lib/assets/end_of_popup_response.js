(function () {
  var config = JSON.parse(document.getElementById('config').innerHTML);

  if (config.setCredentialToken) {
    var credentialToken = config.credentialToken;
    var credentialSecret = config.credentialSecret;

    if (window.opener && window.opener.DoraOAuth) {
      window.opener.DoraOAuth._handleCredentialSecret(
          credentialToken, credentialSecret);
    } else {
      try {
        localStorage[config.storagePrefix + credentialToken] = credentialSecret;
      } catch (err) {
        // We can't do much else, but at least close the popup instead
        // of having it hang around on a blank page.
      }
    }
  }

  document.getElementById('completedText').style.display = 'block';
  document.getElementById('loginCompleted').onclick = function () {
      window.close();
  };
  window.close();
})();