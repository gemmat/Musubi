const EXPORTED_SYMBOLS = [];
Components.utils.import("resource://musubi/modules/00-Utils.jsm");

var inBatch = false;

function onItemAdded(aItemId, aFolder, aIndex) {
  Application.console.log("added:" + aItemId + ":" + BookmarksService.getItemTitle(aItemId));
  if (inBatch) Application.console.log("ok");
}

function onItemRemoved(aItemId, aFolder, aIndex) {
}

function onItemChanged(aBookmarkId, aProperty, aIsAnnotationProperty, aValue) {
}

function onItemVisited(aBookmarkId, aVisitID, aTime) {
  Application.console.log("visit:" + aBookmarkId + ":" + BookmarksService.getItemTitle(aBookmarkId));
  if (inBatch) Application.console.log("ok");
}

function onItemMoved(aItemId, aOldParent, aOldIndex, aNewParent, aNewIndex) {
}

function onBeginUpdateBatch() {
  Application.console.log("begin");
  inBatch = true;
}

function onEndUpdateBatch() {
  Application.console.log("end");
  inBatch = false;
}

function onBeforeItemRemoved(aItemId) {
}

var observer = {
  onItemAdded:         onItemAdded,
  onItemRemoved:       onItemRemoved,
  onItemChanged:       onItemChanged,
  onItemVisited:       onItemVisited,
  onItemMoved:         onItemMoved,
  onBeginUpdateBatch:  onBeginUpdateBatch,
  onEndUpdateBatch:    onEndUpdateBatch,
  onBeforeItemRemoved: onBeforeItemRemoved
};

BookmarksService.addObserver(observer, false);


