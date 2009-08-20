const EXPORT = ["onLoadAtIframe", "onUnloadAtIframe", "byeContacts"];

function res(aXML) {
  Musubi.appendE4XToXmppIn(document.getElementById("sidebar-iframe").contentDocument,
                           aXML);
}

function getMainWin() {
  const Ci = Components.interfaces;
  return window.QueryInterface(Ci.nsIInterfaceRequestor)
               .getInterface(Ci.nsIWebNavigation)
               .QueryInterface(Ci.nsIDocShellTreeItem)
               .rootTreeItem
               .QueryInterface(Ci.nsIInterfaceRequestor)
               .getInterface(Ci.nsIDOMWindow);
}

function connect(aXML) {
  // We have to place the connection info to the browser, cuz sidebar can be closed anytime.
  getMainWin().Musubi.xmppConnect(aXML.connect.toString());
  aXML.@type = "result";
  res(aXML);
}

function disconnect(aXML) {
  getMainWin().Musubi.xmppDisconnect(aXML.disconnect.toString());
  aXML.@type = "result";
  res(aXML);
}

function getAccounts() {
  var accountXMLs = Musubi.callWithMusubiDB(function f2(msbdb) {
    return msbdb.account.findAll().map(msbdb.account.objectToE4X);
  });
  var xml = <musubi type="result"><accounts/></musubi>;
  accountXMLs.forEach(function f3(x) {
    xml.accounts.appendChild(x);
  });
  res(xml);
}

function getAccount(aXML) {
  var accountXML = Musubi.callWithMusubiDB(function f1(msbdb) {
    var account = msbdb.account.findByBarejid(aXML.account.barejid.toString());
    if (!account) return null;
    return msbdb.account.objectToE4X(account[0]);
  });
  if (!accountXML) return;
  res(<musubi type="result">{accountXML}</musubi>);
}

function setAccount(aXML) {
  Musubi.callWithMusubiDB(function f4(msbdb) {
    try {
      var account = new msbdb.account(msbdb.account.E4XToObject(aXML.account));
      // Save the password to the browser's password manager.
      Musubi.updateXMPP4MOZAccount(account);
      XMPP.setPassword(account.barejid, account.password);
      // ...And don't save it to the Musubi DB.
      account.password = null;
      if (msbdb.account.countByBarejid(account.barejid)) {
        msbdb.account.update(account);
      } else {
        msbdb.account.insert(account);
      }
    } catch(e) {
      Musubi.p(e.name + ": " + e.message);
    }
  });
  res(<musubi type="result"><account/></musubi>);
}

function deleteAccount(aXML) {
  Musubi.callWithMusubiDB(function (msbdb) {
    var o = msbdb.account.findByBarejid(aXML.deleteitem.account.barejid.toString());
    if (o) msbdb.account.deleteById(o[0].id);
  });
  aXML.@type = "result";
  res(aXML);
}

function getDefaultJID() {
  var d = new Musubi.Prefs("extensions.musubi.").get("defaultJID", "");
  if (!d) return;
  res(<musubi type="result"><defaultjid>{d}</defaultjid></musubi>);
}

function setDefaultJID(aXML) {
  new Musubi.Prefs("extensions.musubi.").set("defaultJID", aXML.defaultjid.toString());
  getDefaultJID();
}

function getCachedPresences(aXML) {
  //TODO check aXML.@from with presence.@from.
  XMPP.cache.all(XMPP.q().event("presence")).forEach(function (x) {
    res(x.stanza);
  });
}

function openContact(aAccount, aSendto) {
  aAccount = Musubi.parseJID(aAccount);
  aSendto  = Musubi.parseJID(aSendto);
  if (!aAccount || !aSendto) return;
  var url = getMainWin().content.document.location.href;
  if (url == "about:blank")
    url = "http://sites.google.com/site/musubichat/";
  if (/^file/.test(url)) {
    if (!Karaage) return;
    url = Karaage.callWithFtpConnection("ftp://localhost", function(conn) {
      return Karaage.storeHTML(conn);
    });
  }
  if (/^xmpp/.test(url)) {
    var o = Musubi.parseURI(url);
    if (o) url = o.href;
  }
  openUILink(Musubi.makeXmppURI(aAccount.barejid, aSendto.barejid, aSendto.resource, "share", url),
             "tabshifted");
  getMainWin().Musubi.xmppSend(
    <message from={aAccount.fulljid} to={aSendto.fulljid} type="chat">
      <x xmlns="jabber:x:oob">
        <url>{url}</url>
        <desc></desc>
      </x>
    </message>);
}

function onXmppEventAtIframe(aEvent) {
  aEvent.stopPropagation();
  var xml = Musubi.DOMToE4X(aEvent.target);
  switch (xml.name().localName) {
  case "message":  //FALLTHROUGH
  case "presence": //FALLTHROUGH
  case "iq":
    getMainWin().Musubi.xmppSend(xml);
    break;
  case "musubi":
    if (xml.connect.length()) {
      connect(xml);
    } else if (xml.disconnect.length()) {
      disconnect(xml);
    } else if (xml.@type == "get" && xml.accounts.length()) {
      getAccounts();
    } else if (xml.@type == "get" && xml.account.length()) {
      getAccount(xml);
    } else if (xml.@type == "set" && xml.account.length()) {
      setAccount(xml);
    } else if (xml.@type == "get" && xml.defaultjid.length()) {
      getDefaultJID();
    } else if (xml.@type == "set" && xml.defaultjid.length()) {
      setDefaultJID(xml);
    } else if (xml.@type == "get" && xml.cachedpresences.length()) {
      getCachedPresences(xml);
    } else if (xml.@type == "get" && xml.opencontanct.length()) {
      //TODO now then, we don't need @account any more...
      openContact(xml.opencontanct.account.toString(),
                  xml.opencontanct.contact.toString());
    } else if (xml.@type == "set" && xml.deleteitem.length()) {
      deleteAccount(xml);
    }
    break;
  default:
    Musubi.p("oops At MusubiSidebarOnXmppEventAtIframe" + xml.toXMLString());
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
