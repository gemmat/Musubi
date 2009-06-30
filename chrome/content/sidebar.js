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
  case "message":
    sendtoBar.value.split(",").forEach(function f0(x) {
      xml.@to = x;
      XMPP.send(userBar.value, xml);
    });
    break;
  case "iq":
    break;
  case "presence":
    break;
  case "musubi":
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
    } else if (xml.accounts.length() && xml.accounts.@type == "get") {
      var element = <musubi><accounts type="result"/></musubi>;
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
    } else if (xml.accounts.length() && xml.accounts.@type == "set") {
      Musubi.callWithMusubiDB(function f4(msbdb) {
        try {
          for (var i = 0; i < xml.accounts.account.length(); i++) {
            var account = new msbdb.account(msbdb.account.E4XToObject(xml.accounts.account[i]));
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
