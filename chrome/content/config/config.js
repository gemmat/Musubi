const EXPORT = ["onLoadAtIframe", "connect", "onUnloadAtIframe", "byeContacts"];

function updateMainWindowBookmark(aAccount) {
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (mw) {
    mw.Musubi.initializeBookmark(aAccount);
  }
}

function updateSidebarAccountMenu() {
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (mw) {
    var sidebar = mw.Musubi.getMusubiSidebar();
    if (sidebar) {
      sidebar.Musubi.updateAccountMenu();
    }
  }
}

function readAllAccount() {
  var accounts = DBFindAllAccount();
  if (!accounts) return null;
  var xml = <musubi type="result"><accounts/></musubi>;
  accounts.forEach(function f(x) {
    xml.accounts.appendChild(accountObjToE4X(x));
  });
  return xml;
}

function readAccount(aE4X) {
  var p = parseJID(aE4X.account.barejid.toString());
  if (!p) return null;
  var account = DBFindAccount(p);
  if (!account) return null;
  return <musubi type="result">{accountObjToE4X(account)}</musubi>;
}

function createupdateAccount(aE4X) {
  var account = DBNewAccount(accountE4XToObj(aE4X.account));
  updateXMPP4MOZAccount(account);
  XMPP.setPassword(account.barejid, aE4X.account.password.toString());
  updateMainWindowBookmark(account);
  updateSidebarAccountMenu();
  return <musubi type="result"><account/></musubi>;
}

function deleteAccount(aE4X) {
  var p = parseJID(aE4X.account.barejid.toString());
  if (!p) return null;
  var account = DBDeleteAccount(p);
  updateXMPP4MOZAccount(account, true);
  updateSidebarAccountMenu();
  return <musubi type="result"><account del="del"/></musubi>;
}

function getDefaultAuth() {
  var d = MusubiPrefs.get("defaultauth", "default@localhost/Default");
  if (!d) return null;
  return <musubi type="result"><defaultauth>{d}</defaultauth></musubi>;
}

function setDefaultAuth(aE4X) {
  var p = parseJID(aE4X.defaultauth.toString());
  if (!p) return null;
  MusubiPrefs.set("defaultauth", p.fulljid);
  return getDefaultAuth();
}

function getLocales(aProperties) {
  var strings = new Strings(aProperties);
  var xml = <musubi type="result"><locales properties={aProperties}/></musubi>;
  strings.map(function(key, value) {
    xml.locales.appendChild(<locale id={key}>{value}</locale>);
  });
  return xml;
}

function onXmppEventAtIframe(aEvent) {
  function reloadIframe(aId) {
    var elt = document.getElementById(aId);
    if (!elt) return;
    elt.contentWindow.location.reload();
  }
  function evalRequest(aType, aXML) {
    switch (aType) {
    case "get":
      if (xml.accounts.length()) return readAllAccount();
      if (xml.account.length()) return readAccount(xml);
      if (xml.defaultauth.length()) return getDefaultAuth();
      if (xml.locales.length()) return getLocales(xml.locales.@properties.toString());
      break;
    case "set":
      if (xml.account.length()) {
        if (xml.account.@del.length()) {
          reloadIframe("prefpane-account-edit-iframe");
          reloadIframe("prefpane-account-delete-iframe");
          return deleteAccount(xml);
        } else {
          reloadIframe("prefpane-account-edit-iframe");
          reloadIframe("prefpane-account-delete-iframe");
          return createupdateAccount(xml);
        }
      }
      if (xml.defaultauth.length()) return setDefaultAuth(xml);
      break;
    }
    return null;
  }
  aEvent.stopPropagation();
  var xml = DOMToE4X(aEvent.target);
  if (xml.name().localName != "musubi") return;
  appendE4XToXmppIn(getDocumentFromEvent(aEvent),
                    evalRequest(xml.@type.toString(), xml));
}

function onLoadAtIframe(aEvent) {
  document.addEventListener("XmppEvent", onXmppEventAtIframe, false, true);
}

function onUnloadAtIframe(aEvent) {
  document.removeEventListener("XmppEvent", onXmppEventAtIframe, false, true);
}
