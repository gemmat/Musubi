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
  var folderIdFrom  = createFolderIfNotExist(folderIdAuth, "following", -1);
  var folderIdTo    = createFolderIfNotExist(folderIdAuth, "followers", -1);
  return {
    menu: folderIdMenu,
    auth: folderIdAuth,
    none: folderIdNone,
    from: folderIdFrom,
      to: folderIdTo,
    both: folderIdAuth
  };
}

function insertRosterItem(aFolder, aAuth, aPath, aSubscription, aGroup) {
  aSubscription = aSubscription || "both";
  var p = parseJID(aAuth);
  if (!p) return;
  var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
  uri.spec = makeXmppURI(p.resource ? p.fulljid : p.barejid + "/Musubi", aPath, "share");
  if (BookmarksService.isBookmarked(uri)) {
    BookmarksService.getBookmarkIdsForURI(uri, {}).forEach(function(x) {
      if (aFolder != BookmarksService.getFolderIdForItem(x)) {
        BookmarksService.removeItem(x);
        BookmarksService.insertBookmark(aFolder, uri, -1, aPath);
      }
    });
  } else {
    BookmarksService.insertBookmark(aFolder, uri, -1, aPath);
  }
}

function insertRoster(aStanza) {
  if (aStanza.@type != "result") return;
  var nsIQRoster = new Namespace("jabber:iq:roster");
  if (!aStanza.nsIQRoster::query.length()) return;
  BookmarksService.runInBatchMode({
    runBatched: function batch(aData) {
      var auth = aStanza.@from.toString();
      var items = aStanza.nsIQRoster::query.nsIQRoster::item;
      var folders = createFolders(auth);
      for (var i = 0, len = items.length(); i < len; i++) {
        var item = items[i];
        var subs = item.@subscription.toString();
        insertRosterItem(folders[subs],
                         auth,
                         item.@jid.toString(),
                         subs,
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

function makePath(aItemId) {
  var item = aItemId;
  var arr = [];
  while (item) {
    arr.push({id: item, title:BookmarksService.getItemTitle(item)});
    item = BookmarksService.getFolderIdForItem(item);
  }
  return arr;
}

// TODO: How should we do when the user rename our bookmark folder("following" etc.)?

var EXPORT = [m for (m in new Iterator(this, true))
                          if (m[0] !== "_" && m !== "EXPORT")];
