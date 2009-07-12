const EXPORT = ["sendMessageToIframe", "onXmppEventAtIframe", "onLoadAtIframe", "onUnloadAtIframe"];

function sendMessageToIframe(aXML) {
  var elts = document.getElementById("sidebar-iframe").contentDocument.getElementsByTagName("XmppIn");
  if (elts.length) elts[0].appendChild(Musubi.E4XToDOM(aXML));
}

function onXmppEventAtIframe(aEvent) {
  const Ci = Components.interfaces;
  var mainWin   = window.QueryInterface(Ci.nsIInterfaceRequestor)
                    .getInterface(Ci.nsIWebNavigation)
                    .QueryInterface(Ci.nsIDocShellTreeItem)
                    .rootTreeItem
                    .QueryInterface(Ci.nsIInterfaceRequestor)
                    .getInterface(Ci.nsIDOMWindow);
  var userBar   = mainWin.document.getElementById("Musubi-userbar");
  var sendtoBar = mainWin.document.getElementById("Musubi-sendtobar");
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
      mainWin.Musubi.toolbar.connect();
    } else if (xml.disconnect.length()) {
      mainWin.Musubi.toolbar.disconnect();
    } else if (xml.urlmsg.length()) {
      var urlmsgFrom  = xml.urlmsg.from.toString();
      var urlmsgURL   = xml.urlmsg.url.toString();
      var urlmsgDesc  = xml.urlmsg.desc.toString();
      openUILink("xmpp:" + urlmsgFrom + "?href;url=" + urlmsgURL, "Tab");
    } else if (xml.sender.length()) {
      //TODO implement.
      //var sender = xml.sender.toString();
      //openUILink("xmpp:" + sender, "Tab");
    } else if (xml.@type == "get" && xml.accounts.length()) {
      var element = <musubi type="result"><accounts/></musubi>;
      if (xml.accounts.account.length()) {
        var accountXML = Musubi.callWithMusubiDB(function f1(msbdb) {
          var id = xml.accounts.account[0].@id.toString();
          return msbdb.account.objectToE4X(msbdb.account.findById(id)[0]);
        });
        element.accounts.appendChild(accountXML);
        Musubi.sidebar.sendMessageToIframe(element);
      } else {
        var accountXMLs = Musubi.callWithMusubiDB(function f2(msbdb) {
          return msbdb.account.findAll().map(msbdb.account.objectToE4X);
        });
        accountXMLs.forEach(function f3(x) {
          element.accounts.appendChild(x);
        });
        Musubi.sidebar.sendMessageToIframe(element);
      }
    } else if (xml.@type == "get" && xml.defaultjid.length()) {
      var d = new Musubi.Prefs("extensions.musubi.").get("defaultJID", "");
      Musubi.sidebar.sendMessageToIframe(<musubi type="result">
                                           <defaultjid>{d}</defaultjid>
                                         </musubi>);
    } else if (xml.@type == "set" && xml.defaultjid.length()) {
      new Musubi.Prefs("extensions.musubi.").set("defaultJID", xml.defaultjid.toString());
      Musubi.sidebar.sendMessageToIframe(<musubi type="result">
                                           <defaultjid>{xml.defaultjid.toString()}</defaultjid>
                                         </musubi>);
    } else if (xml.@type == "set" && xml.accounts.length()) {
      Musubi.callWithMusubiDB(function f4(msbdb) {
        try {
          for (var i = 0; i < xml.accounts.account.length(); i++) {
            var account = new msbdb.account(msbdb.account.E4XToObject(xml.accounts.account[i]));
            // Save the password to the browser's password manager.
            Musubi.updateXMPP4MOZAccount(account);
            XMPP.setPassword(account.jid, account.password);
            // ...And don't save it to the DB.
            account.password = null;
            if (msbdb.account.countById(account.id)) {
              msbdb.account.update(account);
            } else {
              msbdb.account.insert(account);
            }
          }
        } catch(e) {
          p(e.name + ": " + e.message);
        }
      });
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
