const EXPORTED_SYMBOLS = [];
Components.utils.import("resource://musubi/modules/00-Utils.jsm");

var inBatch = false;

function gM() {
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  return mw.Musubi.getMusubiSidebar().Musubi;
}

function onItemAdded(aItemId, aFolder, aIndex) {
  if (inBatch) return;
  gM().onItemAdded(aItemId, aFolder, aIndex);
}

function onItemRemoved(aItemId, aFolder, aIndex) {
  if (inBatch) return;
  gM().onItemRemoved(aItemId, aFolder, aIndex);
}

function onItemChanged(aBookmarkId, aProperty, aIsAnnotationProperty, aValue) {
  if (inBatch) return;
  gM().onItemChanged(aBookmarkId, aProperty, aIsAnnotationProperty, aValue);
}

function onItemVisited(aBookmarkId, aVisitID, aTime) {
  if (inBatch) return;
  gM().onItemVisited(aBookmarkId, aVisitID, aTime);
}

function onItemMoved(aItemId, aOldParent, aOldIndex, aNewParent, aNewIndex) {
  if (inBatch) return;
  gM().onItemMoved(aItemId, aOldParent, aOldIndex, aNewParent, aNewIndex);
}

function onBeforeItemRemoved(aItemId) {
  if (inBatch) return;
  gM().onBeforeItemRemoved(aItemId);
}

function onBeginUpdateBatch() {
  inBatch = true;
  Application.console.log("!");
  gM().onBeginUpdateBatch();
}

function onEndUpdateBatch() {
  inBatch = false;
  gM().onEndUpdateBatch();
}

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


