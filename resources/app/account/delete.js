function onClickDeleteAccount(aBarejid) {
  return function (e) {
    sendMusubiDeleteAccount(aBarejid);
  };
}

function recv(xml) {
  if (xml.name().localName != "musubi") return;
  if (xml.@type == "result" && xml.accounts.length()) {
    var eltAccounts = $("accounts");
    while (eltAccounts.firstChild) eltAccounts.removeChild(eltAccounts.firstChild);
    var df = document.createDocumentFragment();
    for (var i = 0; i < xml.accounts.account.length(); i++) {
      var account = xml.accounts.account[i];
      var p = Musubi.parseJID(account.barejid.toString());
      if (!p) return;
      var service = makeServiceInfo(p.domain);
      var elt = SPAN({className: "delete-button"},
                     UL({className: "service"},
                       LI(IMG({src: service.imgsrc, alt: service.imgalt})),
                       LI(SPAN(p.barejid)),
                       LI(service.imgalt)));
      Event.observe(elt, "click", onClickDeleteAccount(p.barejid));
      df.appendChild(LI(elt));
    }
    eltAccounts.appendChild(df);
  } else if (xml.@type == "result" && xml.account.length()) {
    if (xml.account.@del.length()) {
      sendMusubiReadAllAccount();
    }
  }
}

Event.observe(window, "load", function (evt) {
  Builder.dump(window);
  Musubi.init();
  Musubi.onRecv = recv;
  sendMusubiReadAllAccount();
});
