function recv(aXML) {
}

function main() {
  Musubi.init(recv);
  if (!Musubi.info) {
    Musubi.info = {
      auth: "yourname@gmail.com",
      path: null,
      query: null,
      frag: null
    };
  }
  var gemma = "teruakigemma@gmail.com";
  var chat  = "http://musubi.im/chat/";
  var p = Musubi.parseJID(Musubi.info.auth);
  var insert0 = document.getElementById("insert0");
  var insert1 = document.getElementById("insert1");
  var insert2 = document.getElementById("insert2");
  var insert3 = document.getElementById("insert3");
  var insert4 = document.getElementById("insert4");
  var insert5 = document.getElementById("insert5");
  var insert6 = document.getElementById("insert6");
  var string0 = "xmpp://" + Musubi.info.auth + "/" + gemma + "#" + chat;
  insert0.setAttribute("href", string0);
  insert0.appendChild(document.createTextNode(string0));
  insert1.appendChild(document.createTextNode(Musubi.info.auth));
  insert2.appendChild(document.createTextNode(p.domain));
  insert3.appendChild(document.createTextNode(p.resource));
  var string4 = "xmpp://" + p.barejid + "/1/" + p.barejid + "/2#" + chat;
  insert4.setAttribute("href", string4);
  insert4.appendChild(document.createTextNode(string4));
}

window.onload = main;