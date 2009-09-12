function recv(xml) {
  switch (xml.name().localName) {
  case "message":
    break;
  case "musubi":
    if (xml.@type == "result" && xml.accounts.length()) {
      var eltAccounts = $("accounts");
      while (eltAccounts.firstChild) eltAccounts.removeChild(eltAccounts.firstChild);
      var df = document.createDocumentFragment();
      for (var i = 0; i < xml.accounts.account.length(); i++) {
        var account = xml.accounts.account[i];
        var p = Musubi.parseJID(account.barejid.toString());
        var service = makeServiceInfo(p.domain);
        var elt = SPAN({className: "delete-button"},
                       UL({className: "service"},
                          LI(IMG({src: service.imgsrc, alt: service.imgalt})),
                          LI(SPAN(account.barejid + "/" + account.resource)),
                          LI(service.imgalt)));
        Event.observe(elt, "click", (function(barejid) {
          return function(e) {
            sendMusubiDeleteAccount(barejid);
          };
        })(account.barejid.toString()));
        df.appendChild(LI(elt));
      }
      eltAccounts.appendChild(df);
    } else if (xml.@type == "result" && xml.account.length()) {
      if (xml.account.@del.length()) {
        sendMusubiReadAllAccount();
      }
    }
    break;
  }
}

Event.observe(window, "load", function (evt) {
  Builder.dump(window);
  Musubi.init();
  Musubi.onRecv = recv;
  sendMusubiReadAllAccount();
});
