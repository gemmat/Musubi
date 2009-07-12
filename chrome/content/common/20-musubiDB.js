const EXPORT = ["MusubiDB", "callWithMusubiDB"];

function MusubiDB() {
  this.db = null;
  this.account =
    Entity({
      name : "accounts",
      fields : {
        id                 : "INTEGER PRIMARY KEY",
        name               : "TEXT",
        domain             : "TEXT",
        resource           : "TEXT",
        jid                : "TEXT UNIQUE NOT NULL",
        address            : "TEXT UNIQUE NOT NULL",
        connectionHost     : "TEXT NOT NULL",
        connectionPort     : "INTEGER NOT NULL",
        connectionSecurity : "INTEGER NOT NULL"
      }
    });
  extend(this.account, {
    objectToE4X: function accountObjectToE4X(aObject) {
      return <account id={aObject.id}>
               <name>{aObject.name}</name>
               <domain>{aObject.domain}</domain>
               <resource>{aObject.resource}</resource>
               <jid>{aObject.jid}</jid>
               <address>{aObject.address}</address>
               <password>{aObject.password}</password>
               <connectionHost>{aObject.connectionHost}</connectionHost>
               <connectionPort>{aObject.connectionPort}</connectionPort>
               <connectionSecurity>{aObject.connectionSecurity}</connectionSecurity>
             </account>;
    },
    E4XToObject: function accountE4XtoObject(aXML) {
      return {
        id:                 +aXML.@id               .toString(),
        name:                aXML.name              .toString(),
        domain:              aXML.domain            .toString(),
        resource:            aXML.resource          .toString(),
        jid:                 aXML.jid               .toString(),
        address:             aXML.address           .toString(),
        password:            aXML.password          .toString(),
        connectionHost:      aXML.connectionHost    .toString(),
        connectionPort:     +aXML.connectionPort    .toString(),
        connectionSecurity: +aXML.connectionSecurity.toString()
      };
    }
  });
}

MusubiDB.prototype = {
  get file() {
    let pd = DirectoryService.get("ProfD", Ci.nsIFile);
    pd.append("musubi");
    if (!pd.exists() || !pd.isDirectory()) {
      pd.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
    }
    pd.append("musubi.sqlite");
    return pd;
  },
  open: function MusubiDBOpen() {
    if (!this.db) {
      this.db = new Database(this.file);
      this.db.setPragma("case_sensitive_like", 1);
      this.account.db = this.db;
      this.account.initialize();
    }
  },
  close: function MusubiDBClose() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
};

function callWithMusubiDB(aProc) {
  var msbdb = new MusubiDB();
  msbdb.open();
  var r = aProc(msbdb);
  msbdb.close();
  return r;
}
