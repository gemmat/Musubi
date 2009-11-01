const EXPORT = ["xmppSend", "xmppCachedPresences", "xmppConnect", "xmppDisconnect"];

function xmppSend(aAuth, aXML) {
  xmppConnect(aAuth, function(account) {
    XMPP.send(aAuth.fulljid, aXML);
  });
}

function xmppCachedPresences() {
  //TODO check aE4X.@from with presence.@from.
  return XMPP.cache.all(XMPP.q().event("presence"));
}

function xmppConnect(aAuth, aCont) {
  var a = Application.storage.get(aAuth.fulljid, null);
  if (a) {
    if (aCont) aCont(a);
    return;
  }
  var account = DBFindAccount(aAuth);
  if (!account) {
    print("xmppConnect: account is null.");
    print(aAuth.fulljid);
    return;
  }
  account.resource = aAuth.resource;
  account.channel  = getTopWin().Musubi.makeChannel();
  updateXMPP4MOZAccount(account);
  print("connect:" + aAuth.fulljid);
  // TODO: move a following line to XMPP.up's continuation? How I guard from duplicated tries to connect?
  Application.storage.set(aAuth.fulljid, account);
  // XMPP.up(account, ...) shows a useless dialog, so we use XMPP.up("romeo@localhost/Home", ...);
  XMPP.up(aAuth.fulljid, function cont(jid) {
    XMPP.send(aAuth.fulljid, <presence/>);
    XMPP.send(aAuth.fulljid, <iq type="get" id="roster_1">
                               <query xmlns="jabber:iq:roster"/>
                             </iq>);
    if (aCont) aCont(account);
  });
}

function xmppDisconnect(aAuth) {
  var account = Application.storage.get(aAuth.fulljid, null);
  if (!account) return;
  account.channel.release();
  XMPP.down(aAuth.fulljid);
  Application.storage.set(aAuth.fulljid, null);
}
