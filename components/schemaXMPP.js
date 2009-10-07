Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://musubi/modules/00-Utils.jsm");
Components.utils.import("resource://musubi/modules/20-Prefs.jsm");

function XMPProtocol() {}

XMPProtocol.prototype = {
  classDescription: "XMPP Protocol",
  contractID      : "@mozilla.org/network/protocol;1?name=xmpp",
  classID         : Components.ID("f6cb8fd0-ef54-11dd-ba2f-0800200c9a67"),
  QueryInterface  : XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),

  scheme: "xmpp",
  defaultPort: -1,
  protocolFlags: Ci.nsIProtocolHandler.URI_NOAUTH | Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  allowPort: function XMPProtocolAllowPort(aPort, aScheme) {
    return false;
  },
  newURI: function XMPProtocolNewURI(aSpec, aCharset, aBaseURI) {
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    // handle following two cases.
    // defaultAccount    : "default@localhost/Musubi"
    // aSpec             : "xmpp:juliet@localhost"

    // case 1.
    // aBaseURI.spec : "xmpp://romeo@localhost/someone@localhost"
    // ---------------------------------------------------------
    // Result        : "xmpp://romeo@localhost/juliet@localhost"

    // case 2.
    // aBaseURI.spec : null
    // ---------------------------------------------------------
    // Result        : "xmpp://default@localhost/Home/juliet@localhost"

    var o0 = parseURI(aSpec);
    var o1 = aBaseURI ? parseURI(aBaseURI.spec) : null;
    var o = o0 || o1;
    if (!o) {
      uri.spec = aSpec;
      return uri;
    }
    if (o0 && o1) {
      o.auth = o1.auth;
    }
    if (!o.auth) {
      var pref = new Prefs("extensions.musubi.");
      o.auth = pref.get("defaultAccount", "default@localhost") + "/Musubi";
    }
    if (/^share/.test(o.query)) {
      var mw = WindowMediator.getMostRecentWindow("navigator:browser");
      var currentURI = mw.content.document.documentURI;
      var q = parseURI(currentURI);
      if (q) {
        o.frag = q.frag;
      } else {
        o.frag = currentURI;
      }
      o.query = null;
    } else {
    // handle the frag.
    // aSpec         : "page0.html"
    // aBaseURI      : "xmpp...#http://www.acme.com/index.html"
    // Result        : "xmpp...#http://www.acme.com/page0.html"

    // aSpec         : "xmpp...#page0.html"
    // aBaseURI      : "xmpp...#http://www.acme.com/index.html"
    // Result        : "xmpp...#http://www.acme.com/page0.html"

    // aSpec         : "xmpp...#page0.html"
    // aBaseURI      : "http://www.acme.com/index.html"
    // Result        : "xmpp...#http://www.acme.com/page0.html"
      if (aBaseURI) {
        var spec = o0 ? o0.frag : aSpec;
        var base = IOService.newURI(o1 && o1.frag ? o1.frag : aBaseURI.spec, null, null);
        var standardURL = Cc["@mozilla.org/network/standard-url;1"]
                          .createInstance(Ci.nsIStandardURL);
        standardURL.init(1, -1, spec, aCharset, base);
        standardURL.QueryInterface(Ci.nsIURI);
        o.frag = standardURL.spec;
      }
    }
    uri.spec = makeXmppURI(o.auth, o.path, o.query, o.frag);
    return uri;
  },
  newChannel: function XMPProtocolNewChannel(aURI) {
    var o = parseURI(aURI.spec);
    var url = "about:blank";
    if (o && o.frag) url = o.frag;
    if (o.auth) {
      var mw = WindowMediator.getMostRecentWindow("navigator:browser");
      mw.Musubi.xmppConnect(o.auth, function(x) {});
    }
    return IOService.newChannel(url, null, null);
  }
};

function NSGetModule(compMgr, fileSpec){
	return XPCOMUtils.generateModule([XMPProtocol]);
}
