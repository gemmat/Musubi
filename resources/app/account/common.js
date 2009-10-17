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

function sendMusubiReadAllAccount() {
  Musubi.send(<musubi type="get">
                <accounts/>
              </musubi>);
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
