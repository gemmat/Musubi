const EXPORT = ["MusubiDB", "callWithMusubiDB", "DBFindAccountByBarejid", "DBFindAllAccount", "DBNewAccountFromE4X", "DBDeleteAccountByBarejid"];

function MusubiDB() {
  this.db = null;
  this.account =
    Entity({
      name : "accounts",
      fields : {
        id              : "INTEGER PRIMARY KEY",
        barejid         : "TEXT UNIQUE NOT NULL",
        connectionHost  : "TEXT NOT NULL",
        connectionPort  : "INTEGER NOT NULL",
        connectionScrty : "INTEGER NOT NULL"
      }
    });
  extend(this.account, {
    objectToE4X: function accountObjectToE4X(aObject) {
      return <account>
               <barejid>{aObject.barejid}</barejid>
               <connectionHost>{aObject.connectionHost}</connectionHost>
               <connectionPort>{aObject.connectionPort}</connectionPort>
               <connectionScrty>{aObject.connectionScrty}</connectionScrty>
             </account>;
    },
    E4XToObject: function accountE4XtoObject(aXML) {
      return {
        barejid:          aXML.barejid        .toString(),
        connectionHost:   aXML.connectionHost .toString(),
        connectionPort:  +aXML.connectionPort .toString(),
        connectionScrty: +aXML.connectionScrty.toString()
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

function DBFindAccountByBarejid(aBarejid, aOpt) {
  aOpt = aOpt || {};
  return callWithMusubiDB(function findByBarejid(msbdb) {
    var r = msbdb.account.findByBarejid(aBarejid);
    if (!r || !r[0]) return null;
    return aOpt.E4X ? msbdb.account.objectToE4X(r[0]) : r[0];
  });
}

function DBFindAllAccount(aOpt) {
  aOpt = aOpt || {};
  return callWithMusubiDB(function findAll(msbdb) {
    var r = msbdb.account.findAll();
    if (!r) return null;
    return aOpt.E4X ? r.map(msbdb.account.objectToE4X) : r;
  });
}

function DBNewAccountFromE4X(aE4X) {
  return callWithMusubiDB(function newAccount(msbdb) {
    var obj = msbdb.account.E4XToObject(aE4X);
    if (!obj) return null;
    var account = new msbdb.account(obj);
    if (!account) return null;
    if (msbdb.account.countByBarejid(account.barejid)) {
      msbdb.account.update(account);
    } else {
      msbdb.account.insert(account);
    }
    return account;
  });
}

function DBDeleteAccountByBarejid(aBarejid) {
  return callWithMusubiDB(function deleteAccount(msbdb) {
    var r = msbdb.account.findByBarejid(aBarejid);
    if (!r || !r[0]) return null;
    msbdb.account.deleteById(r[0].id);
    return r[0];
  });
}
