const EXPORT = ["isChanP", "chanSend", "filterBrowsersForChan"];
// export filterBrowsersForChan just for the debug.

function isChanP(aJID) {
  return aJID && aJID.node === "" && aJID.domain == "chan";
}

function chanSend(aFrom, aTo, aStanza) {
  aStanza.@from = aTo.fulljid;
  if (!isChanP(aFrom)) aStanza.@owner = aFrom.fulljid;
  delete aStanza.@to;
  delete aStanza.@rsrc;
  var owner = parseJID(aStanza.@owner.toString());
  if (!owner) return;
  appendStanzaToBrowsers(filterBrowsersForChan(aFrom, aTo, owner), aStanza);
}

function filterWithURIForChan(aFrom, aTo, aOwner, aAuth, aPath, aQuery, aFrag) {
  if (!aFrom || !aTo || !aOwner || !aAuth) return false;
  if (isChanP(aAuth) &&
      aTo.fulljid == aAuth.fulljid) return true;
  if (!aPath) return false;
  if (isChanP(aPath) &&
      aAuth.fulljid == aOwner.fulljid &&
      aTo  .fulljid == aPath .fulljid) return true;
  return false;
}

function filterBrowsersForChan(aFrom, aTo, aOwner) {
  if (!gBrowser) return [];
  var bs = [];
  for (var i = 0, len = gBrowser.browsers.length; i < len; i++) {
    var b = gBrowser.getBrowserAtIndex(i);
    var o = parseURI(b.currentURI.spec);
    if (!o) continue;
    var p = parseJID(o.auth);
    if (!p) continue;
    var q = parseJID(o.path);
    if (filterWithURIForChan(aFrom, aTo, aOwner, p, q, o.query, o.frag)) {
      bs.push(b);
    }
  }
  return bs;
}
