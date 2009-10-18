const EXPORT = ["onLoad", "onUnload", "getMusubiSidebar"];

function onLoad(aEvent) {
  document.addEventListener("XmppEvent", onXmppEventAtDocument, false, true);
  var o = parseURI(window.content.document.location.href);
  if (!o) return;
  var p = parseJID(o.auth);
  if (!p) return;
  xmppConnect(p);
}

function onUnload(aEvent) {
  document.removeEventListener("XmppEvent", onXmppEventAtDocument, false, true);
}

function getMusubiSidebar() {
  var sidebar = document.getElementById("sidebar");
  if (!sidebar || !sidebar.contentWindow.Musubi) return null;
  return {
    win:       sidebar.contentWindow,
    doc:       sidebar.contentDocument,
    Musubi:    sidebar.contentWindow.Musubi
  };
}

function onXmppEventAtDocument(aEvent) {
  var doc = getDocumentFromEvent(aEvent);
  var o = parseURI(doc.location.href);
  if (!o) return;
  var p = parseJID(o.auth);
  if (!p) return;
  var q = parseJID(o.path);
  if (!q) return;
  var xml = DOMToE4X(aEvent.target);
  if (q.resource) {
    xml.@to = q.fulljid;
  } else if (xml.@res.length()) {
    xml.@to = q.barejid + "/" + xml.@res;
  } else {
    xml.@to = q.barejid;
  }
  switch (xml.name().localName) {
  case "message":
    if (o.frag) {
      xml.* += <x xmlns="jabber:x:oob">
                 <url>{o.frag}</url>
                 <desc>{doc.title}</desc>
               </x>;
    }
    break;
  case "iq":
    break;
  case "presence":
    if (xml.@res.length() && xml.@type == "unavailable") {
      // User left the MUC Room.
      bookmarkPresence(<presence from={q.barejid} to={p.fulljid} type="unavailable"/>, true);
    }
    break;
  }
  delete xml.@res;
  xmppSend(p, xml);
}
