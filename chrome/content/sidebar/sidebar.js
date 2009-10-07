const EXPORT = ["onLoadAtIframe", "connect", "onUnloadAtIframe", "byeContacts"];

function res(aE4X) {
  appendE4XToXmppIn(document.getElementById("sidebar-iframe").contentDocument,
                    aE4X);
}

function connect(aE4X) {
  xmppConnect(aE4X.connect.toString(), function cont() {
    aE4X.@type = "result";
    res(aE4X);
  });
}

function disconnect(aE4X) {
  xmppDisconnect(aE4X.disconnect.toString());
  res(<presence type="unavailable" from={aE4X.disconnect.toString()}/>);
  aE4X.@type = "result";
  res(aE4X);
}

function readAllAccount() {
  var accountXMLs = DBFindAllAccount({E4X: true});
  var xml = <musubi type="result"><accounts/></musubi>;
  accountXMLs.forEach(function f(x) {
    xml.accounts.appendChild(x);
  });
  res(xml);
}

function readAccount(aE4X) {
  var accountXML = DBFindAccountByBarejid(aE4X.account.barejid.toString(), {E4X: true});
  if (!accountXML) return;
  res(<musubi type="result">{accountXML}</musubi>);
}

function createupdateAccount(aE4X) {
  var account = DBNewAccountFromE4X(aE4X.account);
  updateXMPP4MOZAccount(account);
  XMPP.setPassword(account.barejid, aE4X.account.password.toString());
  res(<musubi type="result"><account/></musubi>);
}

function deleteAccount(aE4X) {
  var account = DBDeleteAccountByBarejid(aE4X.account.barejid.toString());
  updateXMPP4MOZAccount(account, true);
  res(<musubi type="result"><account del="del"/></musubi>);
}

function getDefaultAccount() {
  var pref = new Prefs("extensions.musubi.");
  if (!pref) return;
  var d = pref.get("defaultaccount", "");
  if (!d) return;
  res(<musubi type="result"><defaultaccount>{d}</defaultaccount></musubi>);
}

function setDefaultAccount(aE4X) {
  var pref = new Prefs("extensions.musubi.");
  if (!pref) return;
  pref.set("defaultaccount", aE4X.defaultaccount.toString());
  getDefaultAccount();
}

function getCachedPresences(aE4X) {
  getTopWin().Musubi.xmppCachedPresences().forEach(function (x) {
    res(x.stanza);
  });
}

function openContact(aAccount, aSendto) {
  aAccount = parseJID(aAccount);
  aSendto  = parseJID(aSendto);
  if (!aAccount || !aSendto) return;
  var mw = getTopWin();
  var url = mw.content.document.location.href;
  if (url == "about:blank")
    url = "http://sites.google.com/site/musubichat/";
  if (/^file/.test(url)) {
    if (!Karaage) return;
    url = Karaage.callWithFtpConnection("ftp://localhost", function(conn) {
      return Karaage.storeHTML(conn);
    });
  }
  if (/^xmpp/.test(url)) {
    var o = parseURI(url);
    if (o) url = o.href;
  }
  var newTab = mw.gBrowser.getBrowserForTab(
                 mw.gBrowser.addTab(
                   makeXmppURI(aAccount.barejid, aSendto.barejid, aSendto.resource || "", "share", url)));
  var onLoadFunc = function(e) {
     mw.Musubi.xmppSend(
         <message from={aAccount.fulljid} to={aSendto.fulljid} type="chat">
           <body>{url}</body>
           <x xmlns="jabber:x:oob">
             <url>{url}</url>
             <desc></desc>
           </x>
         </message>);
    newTab.removeEventListener("load", onLoadFunc, true);
  };
  newTab.addEventListener("load", onLoadFunc, true);
}

function onXmppEventAtIframe(aEvent) {
  aEvent.stopPropagation();
  var xml = DOMToE4X(aEvent.target);
  switch (xml.name().localName) {
  case "message":  //FALLTHROUGH
  case "presence": //FALLTHROUGH
  case "iq":
    getTopWin().Musubi.xmppSend(xml);
    break;
  case "musubi":
    if (xml.connect.length()) {
      connect(xml);
    } else if (xml.disconnect.length()) {
      disconnect(xml);
    } else if (xml.@type == "get" && xml.accounts.length()) {
      readAllAccount();
    } else if (xml.@type == "get" && xml.account.length()) {
      readAccount(xml);
    } else if (xml.@type == "set" && xml.account.length()) {
      if (xml.account.@del.length()) {
        deleteAccount(xml);
      } else {
        createupdateAccount(xml);
      }
    } else if (xml.@type == "get" && xml.defaultaccount.length()) {
      getDefaultAccount();
    } else if (xml.@type == "set" && xml.defaultaccount.length()) {
      setDefaultAccount(xml);
    } else if (xml.@type == "get" && xml.cachedpresences.length()) {
      getCachedPresences(xml);
    } else if (xml.@type == "get" && xml.opencontanct.length()) {
      //TODO now then, we don't need @account any more...
      openContact(xml.opencontanct.account.toString(),
                  xml.opencontanct.contact.toString());
    }
    break;
  default:
    print("oops At MusubiSidebarOnXmppEventAtIframe" + xml.toXMLString());
    break;
  }
}

function byeContacts(aSendto) {
  res(<presence from={aSendto} type="unavailable"/>);
}

function onLoadAtIframe(aEvent) {
  var iframe = document.getElementById("sidebar-iframe");
  if (!iframe) return;
  iframe.addEventListener("XmppEvent", onXmppEventAtIframe, false, true);
}

function onUnloadAtIframe(aEvent) {
  var iframe = document.getElementById("sidebar-iframe");
  if (!iframe) return;
  iframe.removeEventListener("XmppEvent", onXmppEventAtIframe, false, true);
}

// repl.enter(document.getElementById("sidebar").contentWindow)
// var iframe = document.getElementById("sidebar").contentDocument.getElementById("sidebar-iframe");
// var mainWin = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsIDocShellTreeItem).rootTreeItem.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
