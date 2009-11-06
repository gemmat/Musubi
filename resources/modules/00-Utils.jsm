// Functions prefixed a under-score(_) are not exported.

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

const Application      = Cc["@mozilla.org/fuel/application;1"].
                           getService(Ci.fuelIApplication);
const IOService        = Cc["@mozilla.org/network/io-service;1"].
                           getService(Ci.nsIIOService);
const URLParser        = Cc["@mozilla.org/network/url-parser;1?auth=no"]
                           .getService(Ci.nsIURLParser);
const WindowMediator   = Cc["@mozilla.org/appshell/window-mediator;1"].
                           getService(Ci.nsIWindowMediator);
const StringBundleService =  Cc["@mozilla.org/intl/stringbundle;1"]
                               .getService(Ci.nsIStringBundleService);
const PrefService      = Cc["@mozilla.org/preferences-service;1"].
                           getService(Ci.nsIPrefService).
                           QueryInterface(Ci.nsIPrefBranch).
                           QueryInterface(Ci.nsIPrefBranch2);
const DirectoryService = Cc["@mozilla.org/file/directory_service;1"].
                           getService(Ci.nsIProperties);
const StorageService   = Cc["@mozilla.org/storage/service;1"].
                           getService(Ci.mozIStorageService);
const StorageStatementWrapper = Components.Constructor(
                                  "@mozilla.org/storage/statement-wrapper;1",
                                  "mozIStorageStatementWrapper",
                                  "initialize");

function toJSON(aObject) {
  switch (typeof aObject) {
  case "undefined":
  case "function":
  case "unknown": return null;
  case "boolean": return aObject.toString();
  }
  if (aObject === null) return "null";
  if (aObject.toJSON) return aObject.toJSON();
  var results = [];
  for (var p in aObject) {
    results.push(p + ": " + aObject[p]);
  }
  return "{" + results.join(", ") + "}";
}

function print(x) {
  // Debug Printer
  //return;
  Application.console.log(x ? x : "**");
}

function $A(aObj) {
  if (!aObj) return false;
  switch (typeof aObj) {
  case "string":
    return aObj.split("");
  case "object":
    if (aObj instanceof Array) return [].concat(aObj);
    let length = aObj.length || 0, results = new Array(length);
    while (length--) results[length] = aObj[length];
    return results;
  default:
    return false;
  }
}

function filterMap(aArray, aProc) {
  var a = [];
  for (var i = 0; i < aArray.length; i++) {
    var r = aProc(aArray[i]);
    if (r !== false) a.push(r);
  }
  return a;
}

function decapitalize(aString) {
  return aString.substr(0, 1).toLowerCase() + aString.substr(1);
}

function makeURIFromSpec(aURISpec) {
  if (!aURISpec) return null;
  if (/^file:/.test(aURISpec)) {
    var fileHandler = IOService.getProtocolHandler("file")
                        .QueryInterface(Ci.nsIFileProtocolHandler);
    var tempLocalFile = fileHandler.getFileFromURLSpec(aURISpec);
    return IOService.newFileURI(tempLocalFile);
  }
  return IOService.newURI(aURISpec, null, null); // a regular URI
}

function ajaxRequest(aMethod, aURL, aQuery, aOnComplete) {
  function queryToString(aObject) {
    var results = [];
    for (var p in aObject) {
      var key = encodeURIComponent(p), values = aObject[p];
      results.push(key + "=" + values);
    }
    return results.join("&");
  }
  var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
              .createInstance(Ci.nsIXMLHttpRequest);
  req.open(aMethod, aURL, true);
  req.onreadystatechange = function(aEvt) {
    if (req.readyState == 4 && req.status == 200)
      aOnComplete(req);
  };
  req.send(queryToString(aQuery));
}

function makeXmppURI(aAuth, aPath, aQuery, aFrag) {
  return "xmpp://" +
         aAuth +
         (aPath  ? "/" + aPath  : "") +
         (aQuery ? "?" + aQuery : "") +
         (aFrag  ? "#" + aFrag  : "");
}

// We'll reuse parseURI and parseJID functions at App_Musubi/musubi.js
// so please implement it in Javascript ver. 1.5.
function parseURI(aURISpec) {
  function parseXmpp(aURISpec, aCont) {
    var m;
    m = /^xmpp:\/\//.exec(aURISpec);
    if (m) return ["xmpp://", aURISpec.slice(m[0].length)];
    m = /^xmpp:/.exec(aURISpec);
    if (m) return ["xmpp:", aURISpec.slice(m[0].length)];
    return null;
  }
  function parseFrag(aURISpec) {
    var m = /#(.*)/.exec(aURISpec);
    if (m) return [m[1], aURISpec.slice(0, -m[0].length)];
    return [null, aURISpec];
  }
  function parseQuery(aURISpec) {
    var m = /\?(.*)$/.exec(aURISpec);
    if (m) return [m[1], aURISpec.slice(0, -m[0].length)];
    return [null, aURISpec];
  }
  function parseHier(aURISpec, aScheme) {
    var arr = aURISpec.split("/");
    switch (arr.length) {
    case 1:
      if (aScheme == "xmpp:")
        return [null, arr[0]];
      break;
    case 2:
      if (aScheme == "xmpp:")
        return [null, arr[0] + "/" + arr[1]];
      if (aScheme == "xmpp://")
        return [arr[0] + "/" + arr[1], null];
      break;
    case 3:
      if (aScheme == "xmpp://")
        return [arr[0] + "/" + arr[1], arr[2]];
      break;
    case 4:
      if (aScheme == "xmpp://")
        return [arr[0] + "/" + arr[1], arr[2] + "/" + arr[3]];
      break;
    }
    return null;
  }
  var tmp;
  tmp = parseXmpp(aURISpec);
  if (!tmp) return null;
  var scheme = tmp[0];
  tmp = parseFrag(tmp[1]);
  var frag = tmp[0];
  tmp = parseQuery(tmp[1]);
  var query = tmp[0];
  tmp = parseHier(tmp[1], scheme);
  if (!tmp) return null;
  var auth = tmp[0], path = tmp[1];
  return {
    auth:  auth,
    path:  path,
    query: query,
    frag:  frag
  };
}

function parseJID(aString) {
  if (!aString) return null;
  var m = /^(.+?@)?(.+?)(?:\/|$)(.*$)/.exec(aString);
  if (!m) return null;
  if (m[1] == undefined) m[1] = "";
  return {
    node:     m[1] ? m[1].slice(0, -1) : "",
    domain:   m[2],
    resource: (aString.indexOf("/") == -1) ? null : m[3],
    barejid:  m[1] + m[2],
    fulljid:  m[1] + m[2] + "/" + m[3]
  };
}

const _MODULE_BASE_URI = "resource://musubi/modules/";

function loadModules() {
  var uris = _getModuleURIs();
  uris.forEach(function (uri) {
    return Cu.import(uri, this);
  }, this);
}

function loadPrecedingModules() {
  var uris = _getModuleURIs();
  var self = _MODULE_BASE_URI + this.__LOCATION__.leafName;
  var i = uris.indexOf(self);
  if (i === -1) return;
  uris.slice(0, i).forEach(function (uri) {
    return Cu.import(uri, this);
  }, this);
}

function _getModuleURIs() {
  var uris = [];
  var files = __LOCATION__.parent.directoryEntries;
  while (files.hasMoreElements()) {
    var file = files.getNext().QueryInterface(Ci.nsIFile);
    if (/\.jsm$/.test(file.leafName))
      uris.push(_MODULE_BASE_URI + file.leafName);
  }
  return uris.sort();
}

/*
 * original code by tombloo
 * http://github.com/to/tombloo
 * Following codes follow the license of the Tombloo.
 */

function extend(target, source, overwrite) {
  overwrite = overwrite == null ? true : overwrite;
  for (var p in source) {
    var getter = source.__lookupGetter__(p);
    if(getter) target.__defineGetter__(p, getter);
    var setter = source.__lookupSetter__(p);
    if(setter) target.__defineSetter__(p, setter);
    if(!getter && !setter && (overwrite || !(p in target)))
      target[p] = source[p];
  }
  return target;
}

function update(self, obj) {
  if (self === null) {
    self = {};
  }
  for (var i = 1; i < arguments.length; i++) {
    var o = arguments[i];
    if (typeof(o) != "undefined" && o !== null) {
      for (var k in o) {
        self[k] = o[k];
      }
    }
  }
  return self;
}

var EXPORTED_SYMBOLS = [m for (m in new Iterator(this, true))
                          if (m[0] !== "_" && m !== "EXPORTED_SYMBOLS")];
