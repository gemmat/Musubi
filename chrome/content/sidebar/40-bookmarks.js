function queryXmppBookmark(aAuth, aPath, aFolder, aFulljidP) {
  var result;
  if (aFolder) {
    result = Places.getFolderContents(aFolder, false, false).root;
  } else {
    var query = HistoryService.getNewQuery();
    var options = HistoryService.getNewQueryOptions();
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    uri.spec = "xmpp://" + aAuth.barejid;
    query.uri = uri;
    query.uriIsPrefix = true;
    query.onlyBookmarked = true;
    options.queryType = options.QUERY_TYPE_BOOKMARKS;
    var tmp = createFolders(aAuth);
    var folders = [tmp.remv, tmp.none, tmp.to, tmp.from, tmp.both];
    query.setFolders(folders, folders.length);
    result = HistoryService.executeQuery(query, options).root;
  }
  result.containerOpen = true;
  var arr = [];
  for (var i = 0, len = result.childCount; i < len; i++) {
    var node = result.getChild(i);
    if (!Places.nodeIsBookmark(node)) continue;
    var o = parseURI(node.uri);
    if (!o) continue;
    var q = parseJID(o.path);
    if (!q) continue;
    if (aFulljidP) {
      if (q.fulljid == aPath.fulljid) arr.push(node.itemId);
    } else {
      if (q.barejid == aPath.barejid) arr.push(node.itemId);
    }
  };
  result.containerOpen = false;
  return arr;
}

function createFolderIfNotExist(aCurrentFolderId, aName, aPosition) {
  return BookmarksService.getChildFolder(aCurrentFolderId, aName) ||
    BookmarksService.createFolder(aCurrentFolderId, aName, aPosition);
}

function createFolders(aAuth) {
  var folderIdMenu  = BookmarksService.bookmarksMenuFolder;
  var folderIdAuth  = createFolderIfNotExist(folderIdMenu, aAuth.barejid, -1);
  var folderIdRemv  = createFolderIfNotExist(folderIdAuth, "remove", -1);
  var folderIdNone  = createFolderIfNotExist(folderIdAuth, "none", -1);
  var folderIdTo    = createFolderIfNotExist(folderIdAuth, "following", -1);
  var folderIdFrom  = createFolderIfNotExist(folderIdAuth, "followers", -1);
  var folderIdBoth  = createFolderIfNotExist(folderIdAuth, "both", -1);
  return {
    auth: folderIdAuth,
    remv: folderIdRemv,
    none: folderIdNone,
      to: folderIdTo,
    from: folderIdFrom,
    both: folderIdBoth
  };
}

//remove a resource and append the account's resource.
function parseJIDwithResource(aString) {
  var tmp = parseJID(aString);
  if (!tmp) return null;
  var account = DBFindAccount(tmp);
  if (!account) return null;
  var p = parseJID(account.barejid + "/" + account.resource);
  if (!p) return null;
  return p;
}

// TODO: represent aGroup as a Bookmark tag(taggingService.tagURI).

function insertRosterItem(aFolder, aAuth, aPath, aName, aGroup) {
  if (!aFolder) return;
  aName = aName || aPath.barejid;
  var arr = queryXmppBookmark(aAuth, aPath);
  if (arr.length) {
    arr.forEach(function(id) {
      if (aFolder != BookmarksService.getFolderIdForItem(id)) {
        BookmarksService.moveItem(id, aFolder, -1);
      }
    });
  } else {
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    uri.spec = makeXmppURI(aAuth.fulljid, aPath.barejid, "share");
    BookmarksService.insertBookmark(aFolder, uri, -1, aName);
  }
}

function insertRoster(aStanza) {
  var type = aStanza.@type.toString();
  if (type != "result" && type != "set") return;
  var nsIQRoster = new Namespace("jabber:iq:roster");
  if (!aStanza.nsIQRoster::query.length() ||
      !aStanza.nsIQRoster::query.nsIQRoster::item.length()) return;
  var p = parseJIDwithResource(aStanza.@to.toString());
  if (!p) return;
  BookmarksService.runInBatchMode({
    runBatched: function batch(aData) {
      var items = aStanza.nsIQRoster::query.nsIQRoster::item;
      var folders = createFolders(p);
      for (var i = 0, len = items.length(); i < len; i++) {
        var item = items[i];
        var q = parseJID(item.@jid.toString());
        if (!q) continue;
        insertRosterItem(folders[item.@subscription.toString()],
                         p,
                         q,
                         item.@name.length() && item.@name.toString(),
                         item.nsIQRoster::group.toString());
      }
    }
  }, null);
}

function insertPresenceItem(aFolder, aAuth, aPath, aName) {
  aName = aName || aPath.barejid;
  var arr = queryXmppBookmark(aAuth, aPath, aFolder, true);
  if (!arr.length) {
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    uri.spec = makeXmppURI(aAuth.fulljid, aPath.fulljid, "share");
    BookmarksService.insertBookmark(aFolder, uri, -1, aName);
  }
}

function removePresenceItem(aFolder, aAuth, aPath) {
  var arr = queryXmppBookmark(aAuth, aPath, aFolder, true);
  arr.forEach(function(id) {
    if (aFolder == BookmarksService.getFolderIdForItem(id)) {
      BookmarksService.removeItem(id);
    }
  });
}

function insertPresence(aStanza) {
  //remove the resource and extend the account's resource.
  var p = parseJIDwithResource(aStanza.@to.toString());
  if (!p) return;
  var q = parseJID(aStanza.@from.toString());
  if (!q) return;
  switch (aStanza.@type.toString()) {
  case "unavailable":
    BookmarksService.runInBatchMode({
      runBatched: function batch(aData) {
        removePresenceItem(createFolders(p)["auth"], p, q);
      }
    }, null);
    break;
  case "subscribe":
    break;
  case "subscribed":
    break;
  case "unsubscribed":
    break;
  case "unsubscribe":
    break;
  default:
    BookmarksService.runInBatchMode({
      runBatched: function batch(aData) {
        insertPresenceItem(createFolders(p)["auth"], p, q);
      }
    }, null);
  }
}

function test() {
  insertRoster(<iq from="teruakigemma@gmail.com/1" to="teruakigemma@gmail.com" type="result">
         <query xmlns="jabber:iq:roster">
           <item jid="None0@localhost"      subscription="none"/>
           <item jid="None1@wonderland.lit" subscription="none"/>
           <item jid="From0@wonderland.lit" subscription="from"/>
           <item jid="From1@realworld.lit"  subscription="from">
             <group>friend</group>
           </item>
           <item jid="to0@wonderland.lit"   subscription="to"/>
           <item jid="to1@realworld.lit"    subscription="to"/>
           <item jid="both0@wonderland.lit" subscription="both"/>
           <item jid="both1@realworld.lit"  subscription="both">
             <group>friend</group>
           </item>
         </query>
       </iq>);
}

// the Unix command "pwd" like

function pwdBookmark(aItemId) {
  var arr = [];
  for (var id = aItemId; id; id = BookmarksService.getFolderIdForItem(id)) {
    arr.push(id);
  }
  return arr;
}

function findPWDSubscription(aAuth, aPWD) {
  var folders = createFolders(aAuth);
  for (var i = 0; i < aPWD.length; i++) {
    switch (aPWD[i]) {
    case folders.remv: return "remove";
    case folders.none: return "none";
    case folders.to:   return "to";
    case folders.from: return "from";
    case folders.both: return "both";
    }
  }
  return null;
}

// TODO: How should we do when the user rename our bookmark folder("following" etc.)?

function onItemAdded(aItemId, aFolder, aIndex) {
  Application.console.log("added:" + aItemId);
  try {
    var title = BookmarksService.getItemTitle(aItemId);
    var uri   = BookmarksService.getBookmarkURI(aItemId);
  } catch (e) {
    return;
  }
  if (!uri) return;
  var o = parseURI(uri.spec);
  if (!o) return;
  var p = parseJID(o.auth);
  if (!p) return;
  var q = parseJID(o.path);
  if (!q) return;
  xmppSend(p, <iq type="set" id="roster_2">
               <query xmlns="jabber:iq:roster">
                 <item jid={q.barejid} name={title}/>
               </query>
              </iq>);
  xmppSend(p, <presence to={q.barejid} type="subscribe"/>);
}


// users often remove items easily, so we decided not to correspond "onItemRemoved" to "remove roster".
// Instead of it, "onItemMoved to the 'remove' folder" do to "remove roster".

function onItemRemoved(aItemId, aFolder, aIndex) {
  Application.console.log("removed:" + aItemId);
}

function onItemChanged(aBookmarkId, aProperty, aIsAnnotationProperty, aValue) {
  Application.console.log("changed:" + [aBookmarkId, aProperty, aIsAnnotationProperty, aValue].join(":"));
  if (aProperty != "title") return;
  try {
    var uri = BookmarksService.getBookmarkURI(aBookmarkId);
  } catch (e) {
    return;
  };
  var o = parseURI(uri.spec);
  if (!o || !o.auth || !o.path) return;
  var p = parseJID(o.auth);
  if (!p) return;
  var q = parseJID(o.path);
  if (!q) return;
  xmppSend(p, <iq type="set" id="roster_3">
                 <query xmlns="jabber:iq:roster">
                   <item jid={q.barejid} name={aValue}/>
                 </query>
               </iq>);
}

function onItemVisited(aBookmarkId, aVisitID, aTime) {
  Application.console.log("visit:" + aBookmarkId + ":" + BookmarksService.getItemTitle(aBookmarkId));
}

function onItemMoved(aItemId, aOldParent, aOldIndex, aNewParent, aNewIndex) {
  function evalMove(aPath, aOldSubscription, aNewSubscription) {
    if (!aOldSubscription || !aNewSubscription) return null;
    if (aOldSubscription == aNewSubscription) return null;
    if (aNewSubscription == "remove") {
      return <iq type="set" id="remove1">
                <query xmlns="jabber:iq:roster">
                  <item jid={aPath.barejid} subscription="remove"/>
                </query>
             </iq>;
    }
    switch (aOldSubscription) {
    case "none":
      switch (aNewSubscription) {
      case "to":   return <presence to={aPath.barejid} type="subscribe"/>;
      case "both": return <presence to={aPath.barejid} type="subscribe"/>;
      }
      break;
    case "to":
      switch (aNewSubscription) {
      case "none": return <presence to={aPath.barejid} type="unsubscribe"/>;
      case "from": return <presence to={aPath.barejid} type="subscribe"/>;
      case "both": return <presence to={aPath.barejid} type="subscribe"/>;
      }
      break;
    case "from":
      switch (aNewSubscription) {
      case "none": return <presence to={aPath.barejid} type="unsubscribe"/>;
      case "to":   return <presence to={aPath.barejid} type="unsubscribe"/>;
      case "both": return <presence to={aPath.barejid} type="subscribe"/>;
      }
      break;
    case "both":
      switch (aNewSubscription) {
      case "none": return <presence to={aPath.barejid} type="unsubscribe"/>;
      case "from": return <presence to={aPath.barejid} type="unsubscribe"/>;
      }
      break;
    }
    return null;
  }
  Application.console.log("moved:" + [aItemId, aOldParent, aOldIndex, aNewParent, aNewIndex].join(":"));
  var uri = BookmarksService.getBookmarkURI(aItemId);
  var o = parseURI(uri.spec);
  if (!o) return;
  var p = parseJID(o.auth);
  if (!p) return;
  var q = parseJID(o.path);
  if (!q) return;
  var r = evalMove(q,
                   findPWDSubscription(p, pwdBookmark(aOldParent)),
                   findPWDSubscription(p, pwdBookmark(aNewParent)));
  if (!r) return;
  xmppSend(p, r);
}

function onBeforeItemRemoved(aItemId) {
}

function onBeginUpdateBatch() {
  Application.console.log("beginBatch");
}

function onEndUpdateBatch() {
  Application.console.log("endBatch");
}

var EXPORT = [m for (m in new Iterator(this, true))
                          if (m[0] !== "_" && m !== "EXPORT")];
