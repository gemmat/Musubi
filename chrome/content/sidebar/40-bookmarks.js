function queryXmppBookmark(aAuth) {
  var query = HistoryService.getNewQuery();
  var options = HistoryService.getNewQueryOptions();
  var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
  uri.spec = "xmpp://" + aAuth;
  query.uri = uri;
  query.uriIsPrefix = true;
  query.onlyBookmarked = true;
  options.queryType = options.QUERY_TYPE_BOOKMARKS;
  // hack to get the intersection of all folders of container.
  var folders = [BookmarksService.placesRoot, BookmarksService.placesRoot];
  query.setFolders(folders, folders.length);
  var result = HistoryService.executeQuery(query, options);
  return Places.getURLsForContainerNode(result.root);
}

function filterQuery(aArray, aPathBarejid) {
  return aArray.filter(function (x) {
    if (!x.isBookmark) return false;
    var o = parseURI(x.uri);
    if (!o) return false;
    var p = parseJID(o.path);
    if (!p) return false;
    if (p.barejid != aPathBarejid) return false;
    return true;
  });
}

function createFolderIfNotExist(aCurrentFolderId, aName, aPosition) {
  return BookmarksService.getChildFolder(aCurrentFolderId, aName) ||
    BookmarksService.createFolder(aCurrentFolderId, aName, aPosition);
}

function createFolders(aAuth) {
  var p = parseJID(aAuth);
  if (!p) return null;
  var folderIdMenu  = BookmarksService.bookmarksMenuFolder;
  var folderIdAuth  = createFolderIfNotExist(folderIdMenu, p.barejid, -1);
  var folderIdNone  = createFolderIfNotExist(folderIdAuth, "none", -1);
  var folderIdTo    = createFolderIfNotExist(folderIdAuth, "following", -1);
  var folderIdFrom  = createFolderIfNotExist(folderIdAuth, "followers", -1);
  var folderIdBoth  = folderIdAuth;
  return {
    menu: folderIdMenu,
    auth: folderIdAuth,
    none: folderIdNone,
      to: folderIdTo,
    from: folderIdFrom,
    both: folderIdBoth
  };
}

// TODO: represent aGroup as a Bookmark tag(taggingService.tagURI).

function insertRosterItem(aFolder, aAuth, aPath, aSubscription, aName, aGroup, aQuery) {
  if (!aSubscription || aSubscription == "remove") return;
  aName = aName || aPath;
  aQuery = aQuery || "share";
  var p = parseJID(aAuth);
  if (!p) return;
  var q = parseJID(aPath);
  if (!q) return;
  var arr = filterQuery(queryXmppBookmark(p.barejid), q.barejid);
  if (arr.length) {
    arr.forEach(function(x) {
      var uri = Cc["@mozilla.org/network/simple-uri;1"].
                    createInstance(Ci.nsIURI);
      uri.spec = x.uri;
      BookmarksService.getBookmarkIdsForURI(uri, {}).forEach(function(id) {
        if (aFolder != BookmarksService.getFolderIdForItem(id)) {
          Application.console.log("mv:" + [id, "from=", BookmarksService.getFolderIdForItem(id), "to=", aFolder]);
          BookmarksService.moveItem(id, aFolder, -1);
        }
      });
    });
  } else {
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    uri.spec = makeXmppURI(p.barejid + "/Musubi", q.barejid, "share");
    Application.console.log("ins:" + [uri.spec, "to=", aFolder].join(":"));
    BookmarksService.insertBookmark(aFolder, uri, -1, aName);
  }
}

function insertRoster(aStanza) {
  var type= aStanza.@type.toString();
  if (type != "result" && type != "set") return;
  var nsIQRoster = new Namespace("jabber:iq:roster");
  if (!aStanza.nsIQRoster::query.length() ||
      !aStanza.nsIQRoster::query.nsIQRoster::item.length()) return;
  BookmarksService.runInBatchMode({
    runBatched: function batch(aData) {
      var auth = aStanza.@to.toString();
      var items = aStanza.nsIQRoster::query.nsIQRoster::item;
      var folders = createFolders(auth);
      for (var i = 0, len = items.length(); i < len; i++) {
        var item = items[i];
        var subs = item.@subscription.toString();
        insertRosterItem(folders[subs],
                         auth,
                         item.@jid.toString(),
                         subs,
                         item.@name.toString(),
                         item.nsIQRoster::group.toString());
      }
    }
  }, null);
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
  var title = BookmarksService.getItemTitle(aItemId);
  var uri   = BookmarksService.getBookmarkURI(aItemId);
  if (!uri) return;
  var o = parseURI(uri.spec);
  if (!o) return;
  var p = parseJID(o.path);
  if (!p) return;
  xmppSend(o.auth,
           <iq type="set" id="roster_2">
             <query xmlns="jabber:iq:roster">
               <item jid={p.barejid} name={title}/>
             </query>
           </iq>);
  xmppSend(o.auth, <presence to={p.barejid} type="subscribe"/>);
}

// WTF, the observer calls onItemRemoved *after* it removed the item.
// So I can't touch removed items' title nor uri.
// Yes, Firefox 3.5 introduced onBeforeItemRemoved, but I want to target 3.0 or later.
// For a adhoc solution, as an alternative way of "onBeforeItemRemoved",
// I use a global variable "changed" and "onItemChanged just before onItemRemoved"

var changed = null;

function onItemRemoved(aItemId, aFolder, aIndex) {
  Application.console.log("removed:" + aItemId);
  if (changed && changed.id == aItemId) {
    var p = parseJID(changed.o.path);
    if (!p) return;
    switch (changed.subscription) {
    case "none":
      xmppSend(changed.o.auth,
               <iq type="set" id="roster_4">
                 <query xmlns="jabber:iq:roster">
                   <item jid={p.barejid} subscription="remove"/>
                 </query>
               </iq>);
      break;
    case "from":
    case "to":
    case "both":
      xmppSend(changed.o.auth,
               <iq type="set" id="remove1">
                 <query xmlns="jabber:iq:roster">
                   <item jid={p.barejid} subscription="remove"/>
                 </query>
               </iq>);
      break;
    }
  }
  changed = null;
}

function onItemChanged(aBookmarkId, aProperty, aIsAnnotationProperty, aValue) {
  Application.console.log("changed:" + [aBookmarkId, aProperty, aIsAnnotationProperty, aValue].join(":"));
  try {
    var uri = BookmarksService.getBookmarkURI(aBookmarkId);
  } catch (e) {
    return;
  };
  var o = parseURI(uri.spec);
  if (!o || !o.auth) return;
  var subscription = findPWDSubscription(o.auth, pwdBookmark(aBookmarkId));
  if (!subscription) return;
  changed = {id: aBookmarkId, o: o, subscription: subscription};
}

function onItemVisited(aBookmarkId, aVisitID, aTime) {
  Application.console.log("visit:" + aBookmarkId + ":" + BookmarksService.getItemTitle(aBookmarkId));
}

function onItemMoved(aItemId, aOldParent, aOldIndex, aNewParent, aNewIndex) {
  Application.console.log("moved:" + [aItemId, aOldParent, aOldIndex, aNewParent, aNewIndex].join(":"));
  var uri = BookmarksService.getBookmarkURI(aItemId);
  var o = parseURI(uri.spec);
  if (!o || !o.auth || !o.path) return;
  var p = parseJID(o.path);
  if (!p) return;
  var oldSubscription = findPWDSubscription(o.auth, pwdBookmark(aOldParent));
  var newSubscription = findPWDSubscription(o.auth, pwdBookmark(aNewParent));
  if (!oldSubscription || !newSubscription) return;
  if (oldSubscription == newSubscription) return;
  switch (oldSubscription) {
  case "none":
    switch (newSubscription) {
    case "to":
      xmppSend(o.auth, <presence to={p.barejid} type="subscribe"/>);
      break;
    case "both":
      xmppSend(o.auth, <presence to={p.barejid} type="subscribe"/>);
      break;
    }
    break;
  case "to":
    switch (newSubscription) {
    case "none":
      xmppSend(o.auth, <presence to={p.barejid} type="unsubscribe"/>);
      break;
    case "from":
      xmppSend(o.auth, <presence to={p.barejid} type="subscribe"/>);
      break;
    case "both":
      xmppSend(o.auth, <presence to={p.barejid} type="subscribe"/>);
      break;
    }
    break;
  case "from":
    switch (newSubscription) {
    case "none":
      xmppSend(o.auth, <presence to={p.barejid} type="unsubscribe"/>);
      break;
    case "to":
      xmppSend(o.auth, <presence to={p.barejid} type="unsubscribe"/>);
      break;
    case "both":
      xmppSend(o.auth, <presence to={p.barejid} type="subscribe"/>);
      break;
    }
    break;
  case "both":
    switch (newSubscription) {
    case "none":
      xmppSend(o.auth, <presence to={p.barejid} type="unsubscribe"/>);
      break;
    case "from":
      xmppSend(o.auth, <presence to={p.barejid} type="unsubscribe"/>);
      break;
    }
    break;
  }
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
