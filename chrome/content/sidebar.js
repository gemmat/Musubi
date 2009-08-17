const EXPORT = ["onXmppEventAtIframe", "onLoadAtIframe", "onUnloadAtIframe", "byeContacts"];

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
  var elt = <musubi type="result"><accounts/></musubi>;
  accountXMLs.forEach(function f3(x) {
    elt.accounts.appendChild(x);
  });
  res(elt);
}

function getAccount(aXML) {
  var id = +aXML.account.@id;
  var accountXML = Musubi.callWithMusubiDB(function f1(msbdb) {
    var account = msbdb.account.findById(id);
    if (account) return msbdb.account.objectToE4X(account[0]);
    return null;
  });
  if (!accountXML) return;
  var elt = <musubi type="result">{accountXML}</musubi>;
  res(elt);
}

function setAccount(aXML) {
  Musubi.callWithMusubiDB(function f4(msbdb) {
    try {
      var account = new msbdb.account(msbdb.account.E4XToObject(aXML.account));
      // Save the password to the browser's password manager.
      Musubi.updateXMPP4MOZAccount(account);
      XMPP.setPassword(account.jid, account.password);
      // ...And don't save it to the Musubi DB.
      account.password = null;
      if (msbdb.account.countById(account.id)) {
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
  var accountId = aXML.deleteitem.account.@id.toString();
  Musubi.callWithMusubiDB(function (msbdb) {
    msbdb.account.deleteById(accountId);
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

function openContact(aAccount, aContact) {
  if (!aAccount || !aContact) return;
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
  openUILink("xmpp://" +
             XMPP.JID(aAccount).address +
             "/" +
             XMPP.JID(aContact).address +
             "?share;href=" +
             url,
             "tabshifted");
  getMainWin().Musubi.xmppSend(aAccount,
    <message to={aContact} type="chat">
      <x xmlns="jabber:x:oob">
        <url>{url}</url>
        <desc></desc>
      </x>
    </message>);
}

function onXmppEventAtIframe(aEvent) {
  var xml = Musubi.DOMToE4X(aEvent.target);
  switch (xml.name().localName) {
  case "message":
    // skip it, Musubi.browser.onXmppEventAtDocument will do.
    break;
  case "presence":
    getMainWin().Musubi.xmppSend(xml.@from.toString(), xml);
    break;
  case "iq":
    break;
  case "musubi":
    // Only the sidebar should handle these internal xmpp events. They often include user's info.
    aEvent.stopPropagation();
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
  if (iframe) iframe.addEventListener("XmppEvent", Musubi.sidebar.onXmppEventAtIframe, false, true);
}

function onUnloadAtIframe(aEvent) {
  var iframe = document.getElementById("sidebar-iframe");
  if (iframe) iframe.removeEventListener("XmppEvent", Musubi.sidebar.onXmppEventAtIframe, false, true);
}

// repl.enter(document.getElementById("sidebar").contentWindow)
// var mainWin = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIWebNavigation).QueryInterface(Components.interfaces.nsIDocShellTreeItem).rootTreeItem.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
