if (!Musubi) var Musubi = {};
Components.utils.import("resource://musubi/modules/00-Utils.jsm", Musubi);

/*
 * The following codes follow the licence of the Hatena Bookmark Extension.
 * http://github.com/hatena/hatena-bookmark-xul/
 */

Musubi.extend(Musubi, {
  /*
   * Load a script at the chrome URI.
   */
  loadSubScript: function MusubiAutoloaderLoadSubScript(aURI, aScope) {
    const Cc = Components.classes;
    const Ci = Components.interfaces;
    var subScriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
                            .getService(Ci.mozIJSSubScriptLoader);
    var env = { __proto__: aScope };
    subScriptLoader.loadSubScript(aURI, env);
    if (env.EXPORT)
      env.EXPORT.forEach(function f0(name) {aScope[name] = env[name];});
  },
  getScriptURIs: function MusubiAutoloaderGetScriptURIs(aDirURI) {
    const EXTENSION_ID = "musubi@musubi.ne.jp";
    const Cc = Components.classes;
    const Ci = Components.interfaces;
    var uris = [];
    var dirPath = aDirURI.replace(/^[\w-]+:\/\/[\w.:-]+\//, "");
    var em = Cc["@mozilla.org/extensions/manager;1"]
               .getService(Ci.nsIExtensionManager);
    var baseURI = "chrome://musubi/" + dirPath;
    // XXX jarファイルに固めるのならnsIZipReaderを使ってごにょごにょする。
    var dir = em.getInstallLocation(EXTENSION_ID)
                .getItemFile(EXTENSION_ID, "chrome/" + dirPath);
    if (!dir.exists() || !dir.isDirectory()) return uris;
    var files = dir.directoryEntries;
    while (files.hasMoreElements()) {
      var file = files.getNext().QueryInterface(Ci.nsIFile);
      if (/\.js$/.test(file.leafName))
        uris.push(baseURI + file.leafName);
    }
    return uris.sort();
  }
});

Musubi.loadModules(Musubi);
Musubi.getScriptURIs("chrome://musubi/content/common/").
  forEach(function(uri) {Musubi.loadSubScript(uri, Musubi);});
