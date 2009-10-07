const EXPORT = ["xmppSend", "xmppCachedPresences", "xmppConnect", "xmppDisconnect"];

function xmppSend(aXML) {
  var p = parseJID(aXML.@from.toString());
  if (!p) return;
  var account = Application.storage.get(p.fulljid, null);
  if (!account) {
    p("xmppSend: account is null.");
    p(aXML.toXMLString());
    return;
  }
  delete aXML.@from;
  // XMPP.send(account, ...) shows a useless dialog, so we use XMPP.send("romeo@localhost/Home", ...);
  XMPP.send(p.fulljid, aXML);
}

function xmppCachedPresences() {
  //TODO check aE4X.@from with presence.@from.
  return XMPP.cache.all(XMPP.q().event("presence"));
}

function xmppConnect(aFulljid, aCont) {
  var p = parseJID(aFulljid);
  if (!p) return;
  var a = Application.storage.get(p.fulljid, null);
  if (a) {
    aCont(a);
    return;
  }
  var account = DBFindAccountByBarejid(p.barejid);
  account.resource = p.resoure;
  account.fulljid  = p.fulljid;
  account.channel  = getTopWin().Musubi.makeChannel();
  // XMPP.up(account, ...) shows a useless dialog, so we use XMPP.up("romeo@localhost/Home", ...);
  XMPP.up(p.fulljid, function cont(jid) {
    Application.storage.set(p.fulljid, account);
    xmppSend(<presence from={p.fulljid}/>);
    aCont(account);
  });
}

function xmppDisconnect(aFulljid) {
  var p = parseJID(aFulljid);
  if (!p) return;
  var account = Application.storage.get(p.fulljid, null);
  if (!account) return;
  account.channel.release();
  XMPP.down(p.fulljid);
  Application.storage.set(p.fulljid, null);
}
