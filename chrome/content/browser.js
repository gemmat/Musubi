const EXPORT = ["onLoad", "onUnload", "onXmppEventAtDocument"];

function onLoad(aEvent) {
  document.addEventListener("XmppEvent", Musubi.browser.onXmppEventAtDocument, false, true);
}

function onUnload(aEvent) {
  document.removeEventListener("XmppEvent", Musubi.browser.onXmppEventAtDocument, false, true);
}

function onXmppEventAtDocument(aEvent) {
  var doc = aEvent.target.ownerDocument;
  if (doc instanceof HTMLDocument) {
    var dVFElt = doc.defaultView.frameElement;
    if (dVFElt) {
      while (dVFElt) {
        doc = dVFElt.ownerDocument;
        dVFElt = doc.defaultView.frameElement;
      }
    }
  }
  var o = Musubi.parseURI(doc.location.href);
  var xml = Musubi.DOMToE4X(aEvent.target);
  switch (xml.name().localName) {
  case "message":
    xml.@to = o.sendto;
    xml.*   += <x xmlns="jabber:x:oob">
                <url>{o.href}</url>
                <desc>{aEvent.target.ownerDocument.title}</desc>
              </x>;
    XMPP.send(Musubi.onlineAccounts[o.account], xml);
    break;
  case "iq":
    xml.@to = o.sendto;
    XMPP.send(Musubi.onlineAccounts[o.account], xml);
    break;
  case "musubi":
    if (xml.joinroom.length()) {
      var joinroom = <presence to={o.sendto + "/" + xml.joinroom.@nick}/>;
      XMPP.send(Musubi.onlineAccounts[o.account], joinroom);
    }
    break;
  }
}
