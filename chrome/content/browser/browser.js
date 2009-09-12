const EXPORT = ["onLoad", "onUnload", "getSidebar", "getSidebarIframe"];

function onLoad(aEvent) {
  document.addEventListener("XmppEvent", onXmppEventAtDocument, false, true);
}

function onUnload(aEvent) {
  document.removeEventListener("XmppEvent", onXmppEventAtDocument, false, true);
}

function getSidebar() {
  return document.getElementById("sidebar");
}

function getSidebarIframe() {
  var sidebar = getSidebar();
  if (!sidebar) return null;
  return sidebar.contentDocument.getElementById("sidebar-iframe");
}

function getDocument(aEvent) {
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
  return doc;
}

function onXmppEventAtDocument(aEvent) {
  var doc = getDocument(aEvent);
  var o = Musubi.parseURI(doc.location.href);
  if (!o) return;
  var xml = Musubi.DOMToE4X(aEvent.target);
  if (o.resource) {
    xml.@to = o.sendto + "/" + o.resource;
  } else if (xml.@res.length()) {
    xml.@to = o.sendto + "/" + xml.@res;
  } else {
    xml.@to = o.sendto;
  }
  switch (xml.name().localName) {
  case "message":
    xml.* += <x xmlns="jabber:x:oob">
               <url>{o.href}</url>
               <desc>{aEvent.target.ownerDocument.title}</desc>
             </x>;
    break;
  case "iq":
    break;
  case "presence":
    if (xml.@res.length() && xml.@type == "unavailable") {
      var sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.contentWindow.Musubi.byeContacts(o.sendto);
      }
    }
    break;
  }
  delete xml.@res;
  xml.@from = o.account;
  Musubi.xmppSend(xml);
}
