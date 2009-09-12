function appendAccount(aFulljid) {
  var elt = SPAN({className: "account"}, aFulljid);
  Event.observe(elt, "click", function(e) {
    sendMusubiConnect(aFulljid);
  });
  $("accounts").appendChild(LI(elt));
}

function recv(xml) {
  switch (xml.name().localName) {
  case "musubi":
    if (xml.@type == "result" && xml.accounts.length()) {
      for (var i = 0, len = xml.accounts.account.length(); i < len; i++) {
        appendAccount(xml.accounts.account[i].barejid +
                      "/" +
                      xml.accounts.account[i].resource);
      }
    }
    if (xml.@type == "result" && xml.connect.length()) {
      var p = Musubi.parseJID(xml.connect.toString());
      if (!p) break;
      document.location.href = "xmpp://" + p.barejid + "/" + p.fulljid + "?share;href=sidebar2.html";
    }
    break;
  }
}

function sendMusubiConnect(aAccount) {
  Musubi.send(<musubi type="set">
                <connect>{aAccount}</connect>
              </musubi>);
}

function sendMusubiReadAllAccount() {
  Musubi.send(<musubi type="get">
                <accounts/>
              </musubi>);
}

function recvTest0() {
  recv(<musubi type="result">
         <accounts>
           <account>
             <barejid>romeo@localhost</barejid>
             <resource>Musubi</resource>
             <connectionHost>localhost</connectionHost>
             <connectionPort>5223</connectionPort>
             <connectionScrty>0</connectionScrty>
             <comment></comment>
           </account>
           <account>
             <barejid>teruakigemma@gmail</barejid>
             <resource></resource>
             <connectionHost>talk.google.com</connectionHost>
             <connectionPort>443</connectionPort>
             <connectionScrty>1</connectionScrty>
             <comment></comment>
           </account>
         </accounts>
       </musubi>);
}

function recvTest1() {
  recv(<musubi type="result">
         <connect>romeo@localhost</connect>
       </musubi>);
}


Event.observe(window, "load", function (e) {
  Builder.dump(window);
  Musubi.init();
  Musubi.onRecv = recv;
  sendMusubiReadAllAccount();
});
