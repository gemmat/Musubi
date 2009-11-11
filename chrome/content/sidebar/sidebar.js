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
  var stanza = DOMToE4X(aEvent.target);
  var p = parseJID(o.auth);
  if (!p) return;
  var q = parseJID(o.path);
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  switch (stanza.name().localName) {
  case "musubi":
    if (stanza.init.length()) {
      getCachedPresences(p);
    } else if (stanza.opencontact.length()) {
      if (mw) {
        mw.openUILink(makeXmppURI(o.auth, stanza.opencontact.toString(), "", ""));
      }
    }
    break;
  case "presence":
    if (mw) {
      mw.Musubi.processStanzaWithURI(p, q, stanza);
      mw.Musubi.xmppSend(p, stanza);
    }
    break;
  }
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
    iframe.contentDocument.location.href = makeXmppURI(p.fulljid, null, "", MusubiPrefs.get("defaultsidebar", "resource://musubi/app/presence/index.html"));
  });
}

function updateAccountMenu() {
  var menupopup = document.getElementById("account-menupopup");
  while (menupopup.firstChild) menupopup.removeChild(menupopup.firstChild);
  var accounts = DBFindAllAccount();
  accounts.forEach(function(account) {
    var elt = document.createElement("menuitem");
    elt.setAttribute("label", account.barejid + "/" + account.resource);
    menupopup.appendChild(elt);
  });
  if (accounts.length == 1) {
    var menulist = document.getElementById("account-menulist");
    menulist.selectedIndex = 0;
    onSelectedAccount(menulist);
  }
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

