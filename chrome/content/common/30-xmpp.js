const EXPORT = ["xmppSend", "xmppCachedPresences", "xmppConnect", "xmppDisconnect"];

function xmppSend(aXML) {
  var p = parseJID(aXML.@from.toString());
  if (!p) return;
  var account = Application.storage.get(p.fulljid, null);
  if (!account) {
    print("xmppSend: account is null.");
    print(aXML.toXMLString());
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
    if (aCont) aCont(a);
    return;
  }
  var account = DBFindAccountByBarejid(p.barejid);
  if (!account) {
    print("xmppConnect: account is null.");
    print(aFulljid);
    return;
  }
  account.resource = p.resource;
  account.fulljid  = p.fulljid;
  account.channel  = getTopWin().Musubi.makeChannel();
  updateXMPP4MOZAccount(account);
  // TODO: move a following line to XMPP.up's continuation? How I guard from duplicated tries to connect?
  Application.storage.set(p.fulljid, account);
  print("connect:" + p.fulljid);
  // XMPP.up(account, ...) shows a useless dialog, so we use XMPP.up("romeo@localhost/Home", ...);
  XMPP.up(p.fulljid, function cont(jid) {
    xmppSend(<presence from={p.fulljid}/>);
    xmppSend(<iq from={p.fulljid} to={p.barejid} type="get">
               <query xmlns="jabber:iq:roster"/>
             </iq>);
    if (aCont) aCont(account);
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
