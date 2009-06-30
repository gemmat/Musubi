const EXPORT = ["connect", "disconnect", "handleMusubiURLBarCommand"];

function connect() {
  var musubiUserBar = document.getElementById("Musubi-userbar");
  if (!musubiUserBar ||
      !musubiUserBar.value ||
      Musubi.onlineAccounts[musubiUserBar.value]) return false;
  Musubi.xmppConnect(musubiUserBar.value);
  return true;
}

function disconnect() {
  var musubiUserBar = document.getElementById("Musubi-userbar");
  if (!musubiUserBar ||
      !musubiUserBar.value ||
      !Musubi.onlineAccounts[musubiUserBar.value]) return false;
  Musubi.xmppDisconnect(musubiUserBar.value);
  return true;
}

function handleMusubiURLBarCommand(aTriggeringEvent) {
  if (!gURLBar) return;
  var user   = document.getElementById("Musubi-userbar").value;
  var sendto = document.getElementById("Musubi-sendtobar").value;
  var url    = document.getElementById("Musubi-urlbar").value;
  if (!url || !sendto) return;
  gURLBar.value = user ? "xmpp://" + user + "/" + sendto + "?href;url=" + url
                       : "xmpp:"                + sendto + "?href;url=" + url;
  handleURLBarCommand(aTriggeringEvent);
}
