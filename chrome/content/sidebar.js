const EXPORT = ["onXmppEventAtIframe", "onLoadAtIframe", "onUnloadAtIframe"];

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
}

function disconnect(aXML) {
  getMainWin().Musubi.xmppDisconnect(aXML.disconnect.toString());
}

function urlmsg(aXML) {
  openUILink("xmpp:" + aXML.urlmsg.from + "?share;href=" + aXML.urlmsg.url, "tab");
}

function sender(aXML) {
  //TODO implement.
  //openUILink("xmpp:" + aXML.sender, "Tab");
}

function getAccount(aID) {
  var accountXML = Musubi.callWithMusubiDB(function f1(msbdb) {
    return msbdb.account.objectToE4X(msbdb.account.findById(aID)[0]);
  });
  var elt = <musubi type="result"><accounts/></musubi>;
  elt.accounts.appendChild(accountXML);
  res(elt);
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

function setAccounts(aXML) {
  Musubi.callWithMusubiDB(function f4(msbdb) {
    try {
      for (var i = 0; i < aXML.accounts.account.length(); i++) {
        var account = new msbdb.account(msbdb.account.E4XToObject(aXML.accounts.account[i]));
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
      }
    } catch(e) {
      Musubi.p(e.name + ": " + e.message);
    }
  });
  res(<musubi type="result">
        <ok/>
      </musubi>);
}

function getDefaultJID() {
  var d = new Musubi.Prefs("extensions.musubi.").get("defaultJID", "");
  if (!d) return;
  res(<musubi type="result">
        <defaultjid>{d}</defaultjid>
      </musubi>);
}

function setDefaultJID(aXML) {
  new Musubi.Prefs("extensions.musubi.").set("defaultJID", aXML.defaultjid.toString());
  getDefaultJID();
}

function getCachedPresences() {
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
  if (/^xmpp/.test(url))
    url = Musubi.parseURI(url).href;
  openUILink("xmpp://" +
             XMPP.JID(aAccount).address +
             "/" +
             XMPP.JID(aContact).address +
             "?share;href=" +
             url,
             "tabshifted");
  getMainWin().Musubi.xmppSendURL(XMPP.JID(aAccount).address, aContact, url);
}

function deleteAccount(aAccountId) {
  Musubi.callWithMusubiDB(function (msbdb) {
    return msbdb.account.deleteById(aAccountId);
    });
  res(<musubi type="result">
        <deleteitem><account id={aAccountId}/></deleteitem>
      </musubi>);
}

function onXmppEventAtIframe(aEvent) {
  var xml = Musubi.DOMToE4X(aEvent.target);
  switch (xml.name().localName) {
  case "message":
    // skip it, Musubi.browser.onXmppEventAtDocument will do.
    break;
  case "presence":
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
    } else if (xml.urlmsg.length()) {
      urlmsg(xml);
    } else if (xml.sender.length()) {
      sender(xml);
    } else if (xml.@type == "get" && xml.accounts.length()) {
      if (xml.accounts.account.length()) {
        getAccount(xml.accounts.account[0].@id.toString());
      } else {
        getAccounts();
      }
    } else if (xml.@type == "set" && xml.accounts.length()) {
      setAccounts(xml);
    } else if (xml.@type == "get" && xml.defaultjid.length()) {
      getDefaultJID();
    } else if (xml.@type == "set" && xml.defaultjid.length()) {
      setDefaultJID(xml);
    } else if (xml.@type == "get" && xml.cachedpresences.length()) {
      getCachedPresences();
    } else if (xml.@type == "get" && xml.opencontanct.length()) {
      openContact(xml.opencontanct.account.toString(),
                  xml.opencontanct.contact.toString());
    } else if (xml.@type == "set" && xml.deleteitem.length()) {
      if (xml.deleteitem.account.@id.length()) {
        deleteAccount(xml.deleteitem.account.@id.toString());
      }
    }
    break;
  default:
    Musubi.p("oops At MusubiSidebarOnXmppEventAtIframe" + xml.name().localName);
    break;
  }
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
