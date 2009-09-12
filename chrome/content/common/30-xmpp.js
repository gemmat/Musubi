const EXPORT = ["xmppSend", "xmppCachedPresences"];

function xmppSend(aXML) {
  var p = Musubi.parseJID(aXML.@from.toString());
  if (!p) return;
  var account = Application.storage.get(p.barejid, null);
  if (!account) return;
  delete aXML.@from;
  // XMPP.send(account, ...) shows a useless dialog, so we use XMPP.send("romeo@localhost/Home", ...);
  XMPP.send(account.barejid + "/" + account.resource, aXML);
}

function xmppCachedPresences() {
  //TODO check aE4X.@from with presence.@from.
  return XMPP.cache.all(XMPP.q().event("presence"));
}
