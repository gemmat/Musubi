Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

/*
 * Bug 459107 - Sunbird startup error (NS_ERROR_FILE_NOT_FOUND - nsIXPCComponents_Utils.import)
 * https://bugzilla.mozilla.org/show_bug.cgi?id=459107
 * Bug 457596 -  loading resources with Cu.import during xpcom registration fails
 * https://bugzilla.mozilla.org/show_bug.cgi?id=457596
 */

var iosvc = Components.classes["@mozilla.org/network/io-service;1"].
              getService(Components.interfaces.nsIIOService);
let appdir = __LOCATION__.parent.parent.clone();
// Register our alias here: this code always needs to run first (triggered by app-startup)
let modulesDir = appdir.clone();
modulesDir.append("resources");
modulesDir.append("modules");
modulesDir = iosvc.newFileURI(modulesDir);
// bug 459196:
// we need to cut/hack around the trailing slash, otherwise our modules won't be found
// when loaded like "resource://musubi/modules/foobar.jsm"
modulesDir.spec = modulesDir.spec.replace(/\/$/, "");
iosvc.getProtocolHandler("resource")
  .QueryInterface(Components.interfaces.nsIResProtocolHandler)
  .setSubstitution("musubi", modulesDir);

Components.utils.import("resource://musubi/modules/00-Utils.jsm");
Components.utils.import("resource://musubi/modules/20-Prefs.jsm");

function XMPProtocol() {}

function getContentDocumentURISpec() {
  function defpage() {
    return MusubiPrefs.get("defaultpage", "resource://musubi/app/chat/index.html");
  }
  var mw = WindowMediator.getMostRecentWindow("navigator:browser");
  if (!mw) return defpage();
  var currentURISpec = mw.content.document.documentURI;
  if (!currentURISpec || currentURISpec == "about:blank") return defpage();
  var o = parseURI(currentURISpec);
  if (!o) return currentURISpec;
  return o.frag;
}

XMPProtocol.prototype = {
  classDescription: "XMPP Protocol",
  contractID      : "@mozilla.org/network/protocol;1?name=xmpp",
  classID         : Components.ID("f6cb8fd0-ef54-11dd-ba2f-0800200c9a67"),
  QueryInterface  : XPCOMUtils.generateQI([Ci.nsIProtocolHandler]),

  scheme: "xmpp",
  defaultPort: -1,
  protocolFlags: Ci.nsIProtocolHandler.URI_STD | Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  allowPort: function XMPProtocolAllowPort(aPort, aScheme) {
    return false;
  },
  newURI: function XMPProtocolNewURI(aSpec, aCharset, aBaseURI) {
    var uri = Cc["@mozilla.org/network/simple-uri;1"].
                createInstance(Ci.nsIURI);
    // handle following two cases.
    // defaultauth   : "default@localhost/Musubi"
    // aSpec         : "xmpp:juliet@localhost"

    // case 1.
    // aBaseURI.spec : "xmpp://romeo@localhost/Home/someone@localhost"
    // ---------------------------------------------------------
    // Result        : "xmpp://romeo@localhost/Home/juliet@localhost"

    // case 2.
    // aBaseURI.spec : null
    // ---------------------------------------------------------
    // Result        : "xmpp://default@localhost/Musubi/juliet@localhost"

    var o0 = parseURI(aSpec);
    var o1 = aBaseURI ? parseURI(aBaseURI.spec) : null;
    var o = o0 || o1;
    if (!o) {
      uri.spec = "about:blank";
      return uri;
    }
    if (o0 && o1) o.auth = o1.auth;
    o.auth = o.auth || MusubiPrefs.get("defaultauth", "default@localhost/Default");
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
    } else {
      o.frag = o0 && o0.frag ? o0.frag : getContentDocumentURISpec();
    }
    uri.spec = makeXmppURI(o.auth, o.path, o.query, o.frag);
    return uri;
  },
  newChannel: function XMPProtocolNewChannel(aURI) {
    var o = parseURI(aURI.spec);
    var url = (o && o.frag) ? o.frag : "about:blank";
    return IOService.newChannel(url, null, null);
  }
};

function NSGetModule(compMgr, fileSpec){
	return XPCOMUtils.generateModule([XMPProtocol]);
}
