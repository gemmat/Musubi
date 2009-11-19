const EXPORT = ["onSelectedAccount", "buildAccountMenu", "onCommandDisconnect", "onLoad"];

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

function getSelectedAccount() {
  var menulist  = document.getElementById("account-menulist");
  var item = menulist.selectedItem;
  if (!item) return null;
  if (item.getAttribute("id") == "open-account-manager") {
    onCommandOpenAccount();
    return null;
  }
  return item.label;
}

function onSelectedAccount() {
  var iframe = document.getElementById("sidebar-iframe");
  if (!iframe) return;
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (!mw) return;
  var p = parseJIDwithResource(getSelectedAccount());
  if (!p) return;
  mw.Musubi.xmppConnect(p, function connectFromSidebar(account) {
    iframe.webNavigation.loadURI(
      makeXmppURI(p.fulljid, null, "",
        MusubiPrefs.get("defaultsidebar", "http://musubi.im/presence/")),
      0, null, null, null);
  });
}

function buildAccountMenu() {
  document.getElementById("account-menupopup").builder.rebuild();
  updateAccountMenu();
}

function updateAccountMenu() {
  var p = parseJID(MusubiPrefs.get("defaultauth"));
  if (!p) return;
  var menulist  = document.getElementById("account-menulist");
  for (var i = 0, len = menulist.itemCount; i < len; i++) {
    var menuitem = menulist.getItemAtIndex(i);
    if (menuitem.getAttribute("label") == p.barejid) {
      menulist.selectedItem = menuitem;
      break;
    }
  }
  if (MusubiPrefs.get("autoconnect.sidebar", false))  {
    onSelectedAccount();
  }
}

function onCommandDisconnect() {
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (!mw) return;
  var p = parseJIDwithResource(getSelectedAccount());
  if (!p) return;
  mw.Musubi.xmppDisconnect(p);
  var message = document.getElementById("message");
  var strings = new Strings("chrome://musubi/locale/sidebar.properties");
  message.value = strings.get("offline", [p.barejid]);
  message.setAttribute("class", "");
  setTimeout(function(evt) {
    document.getElementById("message").setAttribute("class", "hidden");
  }, 5000);
  var iframe = document.getElementById("sidebar-iframe");
  if (!iframe) return;
  iframe.webNavigation.loadURI("about:blank", 0, null, null, null);
}

function onCommandOpenAccount() {
  openDialog("chrome://musubi/content/account.xul", "account", "width=440px,height=500px");
}

function onLoad() {
  document.removeEventListener("load", onLoad, true);
  updateAccountMenu();
  if (DBCountAllAccount() == 0) {
    var menulist  = document.getElementById("account-menulist");
    menulist.selectedItem = document.getElementById("open-account-manager");
    onCommandOpenAccount();
  }
  var iframe = document.getElementById("sidebar-iframe");
  if (!iframe) return;
  iframe.addEventListener("XmppEvent", onXmppEventAtIframe, false, true);
}
