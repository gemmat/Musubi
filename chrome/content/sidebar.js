const EXPORT = ["onXmppEventAtIframe", "onLoadAtIframe", "onUnloadAtIframe"];

function res(aXML) {
  Musubi.appendE4XToXmppIn(document.getElementById("sidebar-iframe").contentDocument,
                           aXML);
}

function connect(aXML) {
  var address = aXML.connect.toString();
  if (!Musubi.onlineAccounts[address]) {
    Musubi.xmppConnect(address);
  } else {
    Musubi.xmppDisonnect(address);
  }
}

function disconnect(aXML) {
  Musubi.xmppDisconnect(aXML.disconnect.toString());
}

function urlmsg(aXML) {
  openUILink("xmpp:" + aXML.urlmsg.from + "?href;url=" + aXML.urlmsg.url, "Tab");
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

function onXmppEventAtIframe(aEvent) {
  var xml = Musubi.DOMToE4X(aEvent.target);
  switch (xml.name().localName) {
  case "message": //FALLTHROUGH
  case "iq":      //FALLTHROUGH
  case "presence":
    // skip it, Musubi.browser.onXmppEventAtDocument will do.
    break;
  case "musubi":
    // Only the sidebar should handle this internal xmpp event. It often includes user info.
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
