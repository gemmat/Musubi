const EXPORT = ["xmppSend", "xmppCachedPresences", "xmppConnect", "xmppDisconnect"];

function xmppSend(aXML) {
  var p = parseJID(aXML.@from.toString());
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

function xmppConnect(aBarejid, aCont) {
  var a = Application.storage.get(aBarejid, null);
  if (a) {
    aCont(a);
    return;
  }
  var account = DBFindAccountByBarejid(aBarejid);
  account.channel = getTopWin().Musubi.makeChannel();
  // XMPP.up(account, ...) shows a useless dialog, so we use XMPP.up("romeo@localhost/Home", ...);
  XMPP.up(account.barejid + "/" + account.resource, function cont(jid) {
    Application.storage.set(account.barejid, account);
    xmppSend(<presence from={account.barejid}/>);
    aCont(account);
  });
}

function xmppDisconnect(aBarejid) {
  var account = Application.storage.get(aBarejid, null);
  if (!account) return;
  account.channel.release();
  XMPP.down(account);
  Application.storage.set(aBarejid, null);
}
