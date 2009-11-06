const EXPORT = ["onSelectedAccount", "onLoad", "onUnload"];

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
  var p = parseJID(o.auth);
  if (!p) return;
  var xml = DOMToE4X(aEvent.target);
  switch (xml.name().localName) {
  case "message":  //FALLTHROUGH
  case "presence": //FALLTHROUGH
  case "iq":
    var mw = WindowMediator.getMostRecentWindow("navigator:browser");
    if (!mw) return;
    mw.Musubi.xmppSend(p, xml);
    break;
  case "musubi":
    if (xml.init.length()) {
      getCachedPresences(p);
    }
    break;
  default:
    print("oops At MusubiSidebarOnXmppEventAtIframe" + xml.toXMLString());
    break;
  }
}

function onSelectedAccount(aXULElement) {
  var item = aXULElement.selectedItem;
  if (!item) return;
  var label = item.label;
  if (!label) return;
  var iframe = document.getElementById("sidebar-iframe");
  if (!iframe) return;
  var p = parseJID(label);
  if (!p) return;
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (!mw) return;
  mw.Musubi.xmppConnect(p, function connectFromSidebar(account) {
    iframe.contentDocument.location.href = makeXmppURI(p.fulljid, null, "", "resource://musubi/app/presence/presence.html");
  });
}

function onLoad(aEvent) {
  if (aEvent.originalTarget instanceof HTMLDocument) {
    var menupopup = document.getElementById("account-menupopup");
    while (menupopup.firstChild) menupopup.removeChild(menupopup.firstChild);
    DBFindAllAccount().forEach(function(account) {
      var elt = document.createElement("menuitem");
      elt.setAttribute("label", account.barejid + "/" + account.resource);
      menupopup.appendChild(elt);
    });
    var iframe = document.getElementById("sidebar-iframe");
    if (!iframe) return;
    iframe.addEventListener("XmppEvent", onXmppEventAtIframe, false, true);
  }
}

function onUnload(aEvent) {
  if (aEvent.originalTarget instanceof HTMLDocument) {
    var iframe = document.getElementById("sidebar-iframe");
    if (!iframe) return;
    iframe.removeEventListener("XmppEvent", onXmppEventAtIframe, false, true);
  }
}

