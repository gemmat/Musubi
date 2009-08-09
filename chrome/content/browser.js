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
  var xml = Musubi.DOMToE4X(aEvent.target);
  switch (xml.name().localName) {
  case "message":
    var [user, sendto, url] = Musubi.parseLocationHref(doc.location.href);
    xml.@to = sendto;
    xml.*   += <x xmlns="jabber:x:oob">
                <url>{url}</url>
                <desc>{aEvent.target.ownerDocument.title}</desc>
              </x>;
    var account = Musubi.onlineAccounts[user];
    XMPP.send(account, xml);
    break;
  case "iq":
    var [user, sendto, url] = Musubi.parseLocationHref(doc.location.href);
    xml.@to = sendto;
    XMPP.send(Musubi.onlineAccounts[user], xml);
    break;
  }
}
