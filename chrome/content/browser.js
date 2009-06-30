const EXPORT = ["onLoad", "onUnload", "onTabSelected", "onXmppEventAtDocument"];

function onLoad(aEvent) {
  document.getElementById("Musubi-userbar").value = new Musubi.Prefs("extensions.musubi.").get("defaultJID", "");
  gBrowser.tabContainer.addEventListener("TabSelect", Musubi.browser.onTabSelected, false);
  document.addEventListener("XmppEvent", Musubi.browser.onXmppEventAtDocument, false, true);
}

function onUnload(aEvent) {
  gBrowser.tabContainer.removeEventListener("TabSelect", Musubi.browser.onTabSelected, false);
  document.removeEventListener("XmppEvent", Musubi.browser.onXmppEventAtDocument, false, true);
}

function onTabSelected(aEvent) {
  var [user,sendto,url] = Musubi.parseLocationHref(gBrowser.selectedTab.linkedBrowser.contentWindow.document.location.href);
  document.getElementById("Musubi-userbar")  .value = user;
  document.getElementById("Musubi-sendtobar").value = sendto;
  document.getElementById("Musubi-urlbar")   .value = url;
}

function onXmppEventAtDocument(aEvent) {
  var xml = Musubi.DOMToE4X(aEvent.target);
  var user   = document.getElementById("Musubi-userbar").value;
  var sendto = document.getElementById("Musubi-sendtobar").value;
  sendto.split(",").forEach(function(x) {
    xml.@to = x;
    var account = Musubi.onlineAccounts[user];
    XMPP.send(account, xml);
  });
}
