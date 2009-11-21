const EXPORT = ["bookmarkRoster", "bookmarkPresence", "initializeBookmark", "observeBookmarks"];

Components.utils.import("resource://gre/modules/utils.js");

const HistoryService   = PlacesUtils.history;
const BookmarksService = PlacesUtils.bookmarks;

function queryXmppBookmark(aAuth, aPath, aFolder, aCompareBarejidP) {
  var result;
  if (aFolder) {
    result = PlacesUtils.getFolderContents(aFolder, false, false).root;
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
    if (!PlacesUtils.nodeIsBookmark(node)) continue;
    var o = parseURI(node.uri);
    if (!o) continue;
    if (aPath) {
      var q = parseJID(o.path);
      if (!q) continue;
      if (aCompareBarejidP) {
        if (q.barejid == aPath.barejid) arr.push(node.itemId);
      } else {
        if (q.fulljid == aPath.fulljid) arr.push(node.itemId);
      }
    } else {
      arr.push(node.itemId);
    }
  };
  result.containerOpen = false;
  return arr;
}

function createFolders(aAuth) {
  function createFolderIfNotExist(aId, aCurrentFolderId, aName, aPosition) {
    function isBookmarkFolder(aId) {
      if (!aId) return false;
      try {
        if (BookmarksService.getItemType(aId) ==
              Ci.nsINavBookmarksService.TYPE_FOLDER)
          return aId;
      } catch (e) {}
      return false;
    }
    return isBookmarkFolder(aId) ||
      BookmarksService.createFolder(aCurrentFolderId, aName, aPosition);
  }
  var account = DBFindAccount(aAuth);
  if (!account) return null;
  var strings = new Strings("chrome://Musubi/locale/bookmarks.properties");
  var folderIdMenu  = BookmarksService.bookmarksMenuFolder;
  var folderIdAuth  = createFolderIfNotExist(account.bmAuth, folderIdMenu, aAuth.barejid, -1);
  var folderIdRemv  = createFolderIfNotExist(account.bmRemv, folderIdAuth, strings.get("remove"), -1);
  var folderIdNone  = createFolderIfNotExist(account.bmNone, folderIdAuth, strings.get("none"), -1);
  var folderIdTo    = createFolderIfNotExist(account.bmTo,   folderIdAuth, strings.get("to"), -1);
  var folderIdFrom  = createFolderIfNotExist(account.bmFrom, folderIdAuth, strings.get("from"), -1);
  var folderIdBoth  = createFolderIfNotExist(account.bmBoth, folderIdAuth, strings.get("both"), -1);
  if (account.bmAuth != folderIdAuth ||
      account.bmRemv != folderIdRemv ||
      account.bmNone != folderIdNone ||
      account.bmTo   != folderIdTo   ||
      account.bmFrom != folderIdFrom ||
      account.bmBoth != folderIdBoth) {
    account.bmAuth = folderIdAuth;
    account.bmRemv = folderIdRemv;
    account.bmNone = folderIdNone;
    account.bmTo   = folderIdTo;
    account.bmFrom = folderIdFrom;
    account.bmBoth = folderIdBoth;
    DBUpdateAccount(account);
  }
  return {
    auth: folderIdAuth,
    remv: folderIdRemv,
    none: folderIdNone,
      to: folderIdTo,
    from: folderIdFrom,
    both: folderIdBoth
  };
}

// TODO: represent the roster group with Bookmark tags(taggingService.tagURI).

function insertRosterItem(aAuth, aPath, aFolder, aName, aGroup) {
  if (!aFolder) return;
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
    uri.spec = makeXmppURI(aAuth.fulljid, aPath.barejid);
    BookmarksService.insertBookmark(aFolder, uri, -1, aName);
  }
}

function bookmarkRoster(aStanza) {
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
        insertRosterItem(p,
                         q,
                         folders[item.@subscription.toString()],
                         item.@name.length() ?
                           item.@name.toString() :
                           q.barejid,
                         item.nsIQRoster::group.toString());
      }
    }
  }, null);
}

function insertPresenceItem(aAuth, aPath, aFolder, aName, aSpec, aCompareBarejidP) {
  var arr = queryXmppBookmark(aAuth, aPath, aFolder, aCompareBarejidP);
  if (!arr.length) {
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    uri.spec = aSpec;
    BookmarksService.insertBookmark(aFolder, uri, -1, aName);
  }
}

function removePresenceItem(aAuth, aPath, aFolder, aCompareBarejidP) {
  var arr = queryXmppBookmark(aAuth, aPath, aFolder, aCompareBarejidP);
  arr.forEach(function(id) {
    if (aFolder == BookmarksService.getFolderIdForItem(id)) {
      BookmarksService.removeItem(id);
    }
  });
}

function bookmarkPresence(aStanza, aCompareBarejidP) {
  //remove the resource and extend the account's resource.
  var p = parseJIDwithResource(aStanza.@to.toString());
  if (!p) return;
  var q = parseJID(aStanza.@from.toString());
  if (!q) return;
  switch (aStanza.@type.toString()) {
  case "unavailable":
    BookmarksService.runInBatchMode({
      runBatched: function batch(aData) {
        removePresenceItem(p, q, createFolders(p)["auth"], aCompareBarejidP);
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
        insertPresenceItem(p, q, createFolders(p)["auth"], q.fulljid,
                           makeXmppURI(p.fulljid, q.fulljid), aCompareBarejidP);
      }
    }, null);
  }
}

function findPWDSubscription(aAuth, aItemId) {
  // like the Unix command "pwd".
  function pwdBookmark(aItemId) {
    var arr = [];
    for (var id = aItemId; id; id = BookmarksService.getFolderIdForItem(id)) {
      arr.push(id);
    }
    return arr;
  }
  var arr = pwdBookmark(aItemId);
  var folders = createFolders(aAuth);
  for (var i = 0; i < arr.length; i++) {
    switch (arr[i]) {
    case folders.remv: return "remove";
    case folders.none: return "none";
    case folders.to:   return "to";
    case folders.from: return "from";
    case folders.both: return "both";
    }
  }
  return null;
}

function inBatch() {
  return Application.storage.get("bookmarkInBatch", false);
}

function onItemAdded(aItemId, aFolder, aIndex) {
  if (inBatch()) return;
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
  var subs = findPWDSubscription(p, aItemId);
  if (subs == "remove" || subs == "none") return;
  xmppSend(p, <iq type="set" id="roster_2">
                <query xmlns="jabber:iq:roster">
                  <item jid={q.barejid} name={title}/>
                </query>
              </iq>);
  xmppSend(p, <presence to={q.barejid} type="subscribe"/>);
}

// users often remove items easily, so we decided not to correspond "onItemRemoved" to "remove roster".
// Instead of it, "onItemMoved to the 'remove' folder" do that.
function onItemRemoved(aItemId, aFolder, aIndex) {
  if (inBatch()) return;
}

function onItemChanged(aBookmarkId, aProperty, aIsAnnotationProperty, aValue) {
  if (inBatch()) return;
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
  if (inBatch()) return;
}

function onItemMoved(aItemId, aOldParent, aOldIndex, aNewParent, aNewIndex) {
  if (inBatch()) return;
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
    case "remove":
      switch (aNewSubscription) {
      case "to":   return <presence to={aPath.barejid} type="subscribe"/>;
      case "both": return <presence to={aPath.barejid} type="subscribe"/>;
      }
      break;
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
      case "none": return <presence to={aPath.barejid} type="unsubscribed"/>;
      case "to":   return <presence to={aPath.barejid} type="subscribe"/>;
      case "both": return <presence to={aPath.barejid} type="subscribe"/>;
      }
      break;
    case "both":
      switch (aNewSubscription) {
      case "none": return <presence to={aPath.barejid} type="unsubscribed"/>;
      case "from": return <presence to={aPath.barejid} type="unsubscribe"/>;
      }
      break;
    }
    return null;
  }
  var uri = BookmarksService.getBookmarkURI(aItemId);
  var o = parseURI(uri.spec);
  if (!o) return;
  var p = parseJID(o.auth);
  if (!p) return;
  var q = parseJID(o.path);
  if (!q) return;
  var r = evalMove(q,
                   findPWDSubscription(p, aOldParent),
                   findPWDSubscription(p, aNewParent));
  if (!r) return;
  xmppSend(p, r);
}

function onBeforeItemRemoved(aItemId) {
  if (inBatch()) return;
}

function onBeginUpdateBatch() {
  Application.storage.set("bookmarkInBatch", true);
}

function onEndUpdateBatch() {
  Application.storage.set("bookmarkInBatch", false);
}

function initializeBookmark(aAccount) {
  var p = parseJIDwithResource(aAccount.barejid);
  if (!p) return;
  var strings = new Strings("chrome://Musubi/locale/bookmarks.properties");
  var folderIdAuth = createFolders(p)["auth"];
  removePresenceItem(p, null, folderIdAuth);
}

function observeBookmarks() {
  // guard from dupulication.
  if (!Application.storage.get("ObservingBookmarks", false)) {
    var observer = {
      onItemAdded:         onItemAdded,
      onItemRemoved:       onItemRemoved,
      onItemChanged:       onItemChanged,
      onItemVisited:       onItemVisited,
      onItemMoved:         onItemMoved,
      onBeforeItemRemoved: onBeforeItemRemoved,
      onBeginUpdateBatch:  onBeginUpdateBatch,
      onEndUpdateBatch:    onEndUpdateBatch
    };
    BookmarksService.addObserver(observer, false);
    Application.storage.set("ObservingBookmarks", true);
  }
}



