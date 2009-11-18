const EXPORT = ["onPageShowAccounts", "onPageAdvancedAccounts", "onCommandCheckedAdvanced", "onCommandCheckedDelete", "onWizardFinish"];

function onPageShowAccounts() {
  var list  = document.getElementById("accounts-list");
  for (var i = 0, len = list.itemCount; i < len; i++) {
    var item = list.getItemAtIndex(i);
    if (!item.getAttribute("class")) {
      var image = item.firstChild;
      var label = item.firstChild.nextSibling;
      if (/@gmail\.com$/.test(label.value)) {
        item.setAttribute("class", "account gtalk edit");
        image.setAttribute("class", "gtalk");
      } else {
        item.setAttribute("class", "account jabber edit");
        image.setAttribute("class", "jabber");
      }
    }
  };
}

function onPageAdvancedAccounts() {
  function parseItemClass(item) {
    var arr = item.getAttribute("class").split(" ");
    if (arr.indexOf("create") != -1) return "create";
    if (arr.indexOf("edit")   != -1) return "edit";
    return "";
  }
  function parseItemClass2(item) {
    var arr = item.getAttribute("class").split(" ");
    if (arr.indexOf("gtalk")  != -1) return "gtalk";
    if (arr.indexOf("jabber") != -1) return "jabber";
    return "";
  }
  var item = document.getElementById("accounts-list").selectedItem;
  if (!item) return false;
  var strings = new Strings("chrome://musubi/locale/account.properties");
  switch (parseItemClass2(item)) {
  case "gtalk":
    document.getElementById("edit-header-image").setAttribute("class", "gtalk");
    document.getElementById("edit-header-title").value = strings.get("gtalk-title");
    document.getElementById("domain").value = "gmail.com";
    document.getElementById("connection-host").value = "talk.google.com";
    document.getElementById("connection-port").value = "443";
    document.getElementById("checkbox-advanced").checked = false;
    break;
  case "jabber":
    document.getElementById("edit-header-image").setAttribute("class", "jabber");
    document.getElementById("edit-header-title").value = strings.get("jabber-title");
    document.getElementById("domain").value = "";
    document.getElementById("connection-host").value = "";
    document.getElementById("connection-port").value = "5222";
    document.getElementById("checkbox-advanced").checked = true;
    break;
  default:
    break;
  }
  document.getElementById("checkbox-delete").checked = false;
  onCommandCheckedDelete();
  switch (parseItemClass(item)) {
  case "create":
    document.getElementById("node").value = "";
    document.getElementById("password").value = "";
    document.getElementById("connection-scrty").selectedItem =
      document.getElementById("connection-scrty-ssl");
    document.getElementById("checkbox-delete").disabled = true;
    break;
  case "edit":
    var p = parseJID(item.firstChild.nextSibling.value);
    if (!p) return false;
    var account = DBFindAccount(p);
    if (!account) return false;
    document.getElementById("node").value = p.node;
    document.getElementById("domain").value = p.domain;
    document.getElementById("password").value = XMPP.getPassword(account.barejid);
    document.getElementById("resource").value = account.resource;
    document.getElementById("connection-host").value = account.connectionHost;
    document.getElementById("connection-port").value = account.connectionPort;
    if (account.connectionScrty == 1) {
      document.getElementById("connection-scrty").selectedItem =
        document.getElementById("connection-scrty-ssl");
    } else {
      document.getElementById("connection-scrty-none").selectedItem =
        document.getElementById("connection-scrty-none");
    }
    document.getElementById("checkbox-delete").disabled = false;
    break;
  }

  return true;
}

function onCommandCheckedAdvanced() {
  var flag = !(document.getElementById("checkbox-advanced").checked);
  document.getElementById("resource").disabled = flag;
  document.getElementById("connection-host").disabled = flag;
  document.getElementById("connection-port").disabled = flag;
  document.getElementById("connection-scrty").disabled = flag;
}

function onCommandCheckedDelete() {
  var flag = document.getElementById("checkbox-delete").checked;
  document.getElementById("edit-header-image").disabled = flag;
  document.getElementById("edit-header-title").disabled = flag;
  document.getElementById("node").disabled = flag;
  document.getElementById("domain").disabled = flag;
  document.getElementById("password").disabled = flag;
  document.getElementById("checkbox-advanced").disabled = flag;
  flag = flag || !document.getElementById("checkbox-advanced").checked;
  document.getElementById("resource").disabled = flag;
  document.getElementById("connection-host").disabled = flag;
  document.getElementById("connection-port").disabled = flag;
  document.getElementById("connection-scrty").disabled = flag;
}

function onWizardFinish() {
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (document.getElementById("checkbox-delete").checked) {
    var item = document.getElementById("accounts-list").selectedItem;
    var q = parseJID(item.firstChild.nextSibling.value);
    if (!q) return false;
    var account = DBDeleteAccount(q);
    updateXMPP4MOZAccount(account, true);
  } else {
    if (!document.getElementById("password").value) return false;
    var p = parseJID(document.getElementById("node").value +
                     "@" +
                     document.getElementById("domain").value +
                     "/" +
                     document.getElementById("resource").value);
    if (!p) return false;
    var scrty = (document.getElementById("connection-scrty").selectedItem ==
                 document.getElementById("connection-scrty-none")) ? 0 : 1;
    var account = DBNewAccount({
                                 barejid         : p.barejid,
                                 resource        : p.resource,
                                 connectionHost  : document.getElementById("connection-host").value,
                                 connectionPort  : document.getElementById("connection-port").value,
                                 connectionScrty : scrty
                               });
    if (!account) return false;
    updateXMPP4MOZAccount(account);
    XMPP.setPassword(account.barejid, document.getElementById("password").value);
    MusubiPrefs.set("defaultauth", p.fulljid);
    if (mw) {
      mw.Musubi.initializeBookmark(account);
    }
  }
  if (mw) {
    var sidebar = mw.Musubi.getMusubiSidebar();
    if (sidebar) {
      sidebar.Musubi.buildAccountMenu();
    }
  }
  return true;
}