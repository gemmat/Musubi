const EXPORT = ["xmppSend", "xmppCachedPresences", "xmppConnect", "xmppDisconnect"];

function xmppSend(aAuth, aPath, aStanza, aToMustBeBarejidP) {
  if (isChanP(aAuth)) {
    if (!aStanza.@owner.length()) return;
    aAuth = parseJID(aStanza.@owner.toString());
    if (!aAuth) return;
  }
  if (aPath) {
    if (aToMustBeBarejidP) {
      aStanza.@to = aPath.barejid;
    } else if (aPath.resource) {
      aStanza.@to = aPath.fulljid;
    } else if (aStanza.@rsrc.length()) {
      aStanza.@to = aPath.barejid + "/" + aStanza.@rsrc;
    } else {
      aStanza.@to = aPath.barejid;
    }
  } else {
    delete aStanza.@to;
  }
  delete aStanza.@rsrc;
  delete aStanza.@owner;
  xmppConnect(aAuth, function(account) {
    XMPP.send(aAuth.fulljid, aStanza);
  });
}

function xmppCachedPresences(aAuth) {
  //TODO check aE4X.@from with presence.@from.
  return XMPP.cache.all(XMPP.q().event("presence").direction("in").account(aAuth.fulljid));
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
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (!mw) return;
  account.resource = aAuth.resource;
  account.channel  = mw.Musubi.makeChannel();
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
  if (account) account.channel.release();
  XMPP.down(aAuth.fulljid);
  Application.storage.set(aAuth.fulljid, null);
}
