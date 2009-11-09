function makeServiceInfo(aDomain) {
  switch (aDomain) {
  case "gmail.com":       //FALLTHROUGH
  case "googlemail.com":
    return {
      href:    "gtalk.html",
      imgsrc:  "gtalk.png",
      imgalt:  "Google Talk"
    };
  default:
    return {
      href:    "jabber.html",
      imgsrc:  "jabber.png",
      imgalt:  "Jabber/XMPP"
    };
  }
}

function processLocale(aXML) {
  if (aXML.name().localName == "musubi" &&
      aXML.@type == "result" &&
      aXML.locales.length()) {
    for (var i = 0, len = aXML.locales.locale.length(); i < len; i++) {
      var locale = aXML.locales.locale[i];
      var elt = $(locale.@id.toString());
      if (elt) elt.textContent = locale.toString();
    }
  }
}

function sendMusubiGetLocales(aProperties) {
  Musubi.send(<musubi type="get"><locales properties={aProperties}/></musubi>);
}

function sendMusubiReadAllAccount() {
  Musubi.send(<musubi type="get"><accounts/></musubi>);
}

function sendMusubiReadAccount(aBarejid) {
  Musubi.send(<musubi type="get">
                <account>
                  <barejid>{aBarejid}</barejid>
                </account>
              </musubi>);
}

function sendMusubiCreateUpdateAccount(aBarejid, aResource, aPassword, aConnectionHost, aConnectionPort, aConnectionScrty) {
  Musubi.send(<musubi type="set">
                <account>
                  <barejid>{aBarejid}</barejid>
                  <resource>{aResource}</resource>
                  <password>{aPassword}</password>
                  <connectionHost>{aConnectionHost}</connectionHost>
                  <connectionPort>{aConnectionPort}</connectionPort>
                  <connectionScrty>{aConnectionScrty}</connectionScrty>
                </account>
              </musubi>);
}

function sendMusubiDeleteAccount(aBarejid) {
  Musubi.send(<musubi type="set">
                <account del="del">
                  <barejid>{aBarejid}</barejid>
                </account>
              </musubi>);
}

function sendMusubiGetDefaultAuth() {
  Musubi.send(<musubi type="get">
                <defaultauth/>
              </musubi>);
}

function sendMusubiSetDefaultAuth(aFulljid) {
  Musubi.send(<musubi type="set">
                <defaultauth>{aFulljid}</defaultauth>
              </musubi>);
}

function recvTestRAll() {
  recv(<musubi type="result">
         <accounts>
           <account>
             <barejid>romeo@localhost</barejid>
             <connectionHost>localhost</connectionHost>
             <connectionPort>5223</connectionPort>
             <connectionScrty>0</connectionScrty>
           </account>
           <account>
             <barejid>teruakigemma@gmail</barejid>
             <connectionHost>talk.google.com</connectionHost>
             <connectionPort>443</connectionPort>
             <connectionScrty>1</connectionScrty>
           </account>
         </accounts>
       </musubi>);
}

function recvTestR() {
  recv(<musubi type="result">
         <account>
           <barejid>romeo@localhost</barejid>
           <connectionHost>localhost</connectionHost>
           <connectionPort>5223</connectionPort>
           <connectionScrty>0</connectionScrty>
         </account>
       </musubi>);
}

function recvTestCU() {
  recv(<musubi type="result">
         <account/>
       </musubi>);
}

function recvTestD() {
  recv(<musubi type="result">
         <account del="del"/>
       </musubi>);
}

function recvTest0() {
  recv(<musubi type="result">
         <defaultauth>romeo@localhost/Home</defaultauth>
       </musubi>);
}

function recvTestLocale() {
  recv(<musubi type="result">
         <locales>
           <locale id="locale-username">Localized Username</locale>
           <locale id="locale-password">Localized Password</locale>
         </locales>
       </musubi>);
}