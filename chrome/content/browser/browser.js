const EXPORT = ["onLoad", "onUnload", "getMusubiSidebar"];

function onLoad(aEvent) {
  document.addEventListener("XmppEvent", onXmppEventAtDocument, false, true);
  var o = parseURI(window.content.document.location.href);
  if (!o) return;
  xmppConnect(o.auth);
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
  var p = parseJID(o.path);
  if (!p) return;
  var xml = DOMToE4X(aEvent.target);
  xml.@from = o.auth;
  if (p.resource) {
    xml.@to = p.fulljid;
  } else if (xml.@res.length()) {
    xml.@to = p.barejid + "/" + xml.@res;
  } else {
    xml.@to = p.barejid;
  }
  switch (xml.name().localName) {
  case "message":
    break;
  case "iq":
    break;
  case "presence":
    if (xml.@res.length() && xml.@type == "unavailable") {
    }
    break;
  }
  delete xml.@res;
  xmppSend(o.auth, xml);
}
