const EXPORT = ["onSelectedAccount", "updateAccountMenu", "onLoad", "onUnload"];

function getCachedPresences(aAuth) {
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (!mw) return;
  var doc = document.getElementById("sidebar-iframe").contentDocument;
  mw.Musubi.xmppCachedPresences(aAuth).forEach(function (x) {
    appendE4XToXmppIn(doc, x.stanza);
  });
}

function onXmppEventAtIframe(aEvent) {
  aEvent.stopPropagation();
  var o = parseURI(document.getElementById("sidebar-iframe").contentDocument.location.href);
  if (!o) return;
  var p = parseJID(o.auth);
  if (!p) return;
  var q = parseJID(o.path);
  var stanza = DOMToE4X(aEvent.target);
  if (stanza.name().localName == "musubi") {
    if (stanza.init.length()) {
      getCachedPresences(p);
    }
    return;
  }
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (!mw) return;
  mw.Musubi.processStanzaWithURI(p, q, stanza);
  mw.Musubi.xmppSend(p, stanza);
}

function onSelectedAccount(aXULElement) {
  var item = aXULElement.selectedItem;
  if (!item) return;
  var label = item.label;
  if (!label) return;
  var iframe = document.getElementById("sidebar-iframe");
  if (!iframe) return;
  var p = parseJID(label);
  if (!p) return;
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (!mw) return;
  mw.Musubi.xmppConnect(p, function connectFromSidebar(account) {
    iframe.contentDocument.location.href = makeXmppURI(p.fulljid, null, "", "resource://musubi/app/presence/presence.html");
  });
}

function updateAccountMenu() {
  var menupopup = document.getElementById("account-menupopup");
  while (menupopup.firstChild) menupopup.removeChild(menupopup.firstChild);
  DBFindAllAccount().forEach(function(account) {
    var elt = document.createElement("menuitem");
    elt.setAttribute("label", account.barejid + "/" + account.resource);
    menupopup.appendChild(elt);
  });
}

function onLoad(aEvent) {
  if (aEvent.originalTarget instanceof HTMLDocument) {
    updateAccountMenu();
    var iframe = document.getElementById("sidebar-iframe");
    if (!iframe) return;
    iframe.addEventListener("XmppEvent", onXmppEventAtIframe, false, true);
  }
}

function onUnload(aEvent) {
  if (aEvent.originalTarget instanceof HTMLDocument) {
    var iframe = document.getElementById("sidebar-iframe");
    if (!iframe) return;
    iframe.removeEventListener("XmppEvent", onXmppEventAtIframe, false, true);
  }
}

