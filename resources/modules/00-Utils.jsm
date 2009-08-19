// Functions prefixed a under-score(_) are not exported.

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

const Application      = Cc["@mozilla.org/fuel/application;1"].
                           getService(Ci.fuelIApplication);
const IOService        = Cc["@mozilla.org/network/io-service;1"].
                           getService(Ci.nsIIOService);
const WindowMediator   = Cc["@mozilla.org/appshell/window-mediator;1"].
                           getService(Ci.nsIWindowMediator);
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

function p(x) {
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

function makeXmppURI(aAccount, aSendto, aResource, aQuery, aHref) {
  return "xmpp://" + aAccount + "/" + aSendto +
          (aResource == null ? ""
                             : "/" + aResource) +
          (aQuery ? "?" + aQuery +
                   (aHref ? ";href=" + aHref
                          : "")
                  : "");
}

// We'll reuse parseURI and parseJID functions at App_Musubi/musubi.js
// so please implement it in Javascript ver. 1.5.
function parseURI(aURISpec) {
  function parseHref(aURISpec) {
    var m;
    var reHref = /;href=(.*)$/;
    m = reHref.exec(aURISpec);
    if (m) return [m[1], aURISpec.slice(0, -m[0].length)];
    return ["", aURISpec];
  }
  function parseXmpp(aURISpec) {
    var m;
    var reXMPPColonDoubleSlash = /^xmpp:\/\/([^\/\?#]+)\/([^\/\?#]+)/;
    m = reXMPPColonDoubleSlash.exec(aURISpec);
    if (m) return [m[1], m[2], aURISpec.slice(m[0].length)];
    var reXMPPColon = /^xmpp:([^\/\?#]+)/;
    m = reXMPPColon.exec(aURISpec);
    if (m) return ["", m[1], aURISpec.slice(m[0].length)];
    return null;
  }
  function parseResource(aString) {
    var m;
    var reResource = /^\/([^\/\?#]*)/;
    m = reResource.exec(aString);
    if (m) return [m[1], aString.slice(m[0].length)];
    return [null, aString];
  }
  function parseQuery(aString) {
    var m;
    var reQuery = /^\?(.*)/;
    m = reQuery.exec(aString);
    if (m) return m[1];
    return "";
  }
  var e0 = parseHref(aURISpec);
  var href = e0[0], spec = e0[1];
  var e1 = parseXmpp(spec);
  if (!e1) return null;
  var account = e1[0], sendto = e1[1], r0 = e1[2];
  var e2 = parseResource(r0);
  var resource = e2[0], r1 = e2[1];
  var q  = parseQuery(r1);
  return {
    href:     href,
    account:  account,
    sendto:   sendto,
    resource: resource,
    to:       sendto + (resource == null ? "" : "/" + resource),
    query:    q
  };
}

function parseJID(aString) {
  var m = null;
  m = /^([^\/@\?\#]+)@([^\/@\?\#]+)/.exec(aString);
  if (!m) return null;
  var r = aString.slice(m[0].length), name = m[1], host = m[2];
  m = /^\/([^\/@\?\#]+)$/.exec(r);
  var resource = m ? m[1] : null;
  return {
    name:     name,
    host:     host,
    resource: resource,
    barejid:  name + "@" + host,
    fulljid:  name + "@" + host + "/" + resource
  };
}

function loadModules(aScope) {
  function getModuleFiles() {
    var filenames = [];
    var files = __LOCATION__.parent.directoryEntries;
    while (files.hasMoreElements()) {
      var file = files.getNext().QueryInterface(Ci.nsIFile);
      if (/\.jsm$/.test(file.leafName)) filenames.push(file.leafName);
    }
    return filenames.sort();
  }
  getModuleFiles().forEach(function (uri) {
    Cu.import("resource://musubi/modules/" + uri, aScope);
  });
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
