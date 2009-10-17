const EXPORT = ["onLoadAtIframe", "connect", "onUnloadAtIframe", "byeContacts"];

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
  var account = DBFindAccountByBarejid(aE4X.account.barejid.toString());
  if (!account) return null;
  return <musubi type="result">{accountObjToE4X(account)}</musubi>;
}

function createupdateAccount(aE4X) {
  var account = DBNewAccount(accountE4XToObj(aE4X.account));
  updateXMPP4MOZAccount(account);
  XMPP.setPassword(account.barejid, aE4X.account.password.toString());
  return <musubi type="result"><account/></musubi>;
}

function deleteAccount(aE4X) {
  var account = DBDeleteAccountByBarejid(aE4X.account.barejid.toString());
  updateXMPP4MOZAccount(account, true);
  return <musubi type="result"><account del="del"/></musubi>;
}

function getDefaultAccount() {
  var pref = new Prefs("extensions.musubi.");
  if (!pref) return null;
  var d = pref.get("defaultaccount", "");
  if (!d) return null;
  return <musubi type="result"><defaultaccount>{d}</defaultaccount></musubi>;
}

function setDefaultAccount(aE4X) {
  var pref = new Prefs("extensions.musubi.");
  if (!pref) return null;
  var p = parseJID(aE4X.defaultaccount.toString());
  if (!p) return null;
  pref.set("defaultaccount", p.barejid);
  return getDefaultAccount();
}

function onXmppEventAtIframe(aEvent) {
  aEvent.stopPropagation();
  var xml = DOMToE4X(aEvent.target);
  if (xml.name().localName != "musubi") return;
  var r = null;
  if (xml.@type == "get" && xml.accounts.length()) {
    r = readAllAccount();
  } else if (xml.@type == "get" && xml.account.length()) {
    r = readAccount(xml);
  } else if (xml.@type == "set" && xml.account.length()) {
    if (xml.account.@del.length()) {
      r = deleteAccount(xml);
    } else {
      r = createupdateAccount(xml);
    }
  } else if (xml.@type == "get" && xml.defaultaccount.length()) {
    r = getDefaultAccount();
  } else if (xml.@type == "set" && xml.defaultaccount.length()) {
    r = setDefaultAccount(xml);
  }
  if (r) {
    appendE4XToXmppIn(getDocumentFromEvent(aEvent), r);
  }
}

function onLoadAtIframe(aEvent) {
  document.addEventListener("XmppEvent", onXmppEventAtIframe, false, true);
}

function onUnloadAtIframe(aEvent) {
  document.removeEventListener("XmppEvent", onXmppEventAtIframe, false, true);
}
