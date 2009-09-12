const EXPORT = ["onLoad", "onUnload", "getMusubiSidebar"];

function onLoad(aEvent) {
  document.addEventListener("XmppEvent", onXmppEventAtDocument, false, true);
}

function onUnload(aEvent) {
  document.removeEventListener("XmppEvent", onXmppEventAtDocument, false, true);
}

function getMusubiSidebar() {
  var sidebar = document.getElementById("sidebar");
  if (!sidebar || !sidebar.contentWindow.Musubi) return null;
  var iframe = sidebar.contentDocument.getElementById("sidebar-iframe");
  return {
    win:       sidebar.contentWindow,
    doc:       sidebar.contentDocument,
    Musubi:    sidebar.contentWindow.Musubi,
    iframe: {
      win: iframe.contentWindow,
      doc: iframe.contentDocument
    }
  };
}

function onXmppEventAtDocument(aEvent) {
  var doc = Musubi.getDocumentFromEvent(aEvent);
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
               <desc>{doc.title}</desc>
             </x>;
    break;
  case "iq":
    break;
  case "presence":
    if (xml.@res.length() && xml.@type == "unavailable") {
      var sidebar = getMusubiSidebar();
      if (sidebar) {
        sidebar.Musubi.byeContacts(o.sendto);
      }
    }
    break;
  }
  delete xml.@res;
  xml.@from = o.account;
  Musubi.xmppSend(xml);
}
