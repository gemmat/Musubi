const EXPORT = ["MusubiDB", "accountObjToE4X", "accountE4XToObj", "callWithMusubiDB", "DBFindAccountByBarejid", "DBFindAllAccount", "DBNewAccount", "DBDeleteAccountByBarejid"];

function MusubiDB() {
  this.db = null;
  this.account =
    Entity({
      name : "accounts",
      fields : {
        id              : "INTEGER PRIMARY KEY",
        barejid         : "TEXT UNIQUE NOT NULL",
        resource        : "TEXT NOT NULL",
        connectionHost  : "TEXT NOT NULL",
        connectionPort  : "INTEGER NOT NULL",
        connectionScrty : "INTEGER NOT NULL"
      }
    });
}

function accountObjToE4X(aObject) {
  return <account>
           <barejid>{aObject.barejid}</barejid>
           <resource>{aObject.resource}</resource>
           <connectionHost>{aObject.connectionHost}</connectionHost>
           <connectionPort>{aObject.connectionPort}</connectionPort>
           <connectionScrty>{aObject.connectionScrty}</connectionScrty>
         </account>;
}

function accountE4XToObj(aE4X) {
  return {
    barejid:          aE4X.barejid        .toString(),
    resource:         aE4X.resource       .toString(),
    connectionHost:   aE4X.connectionHost .toString(),
    connectionPort:   parseInt(aE4X.connectionPort .toString(), 10),
    connectionScrty:  parseInt(aE4X.connectionScrty.toString(), 10)
  };
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

function DBFindAccountByBarejid(aBarejid) {
  return callWithMusubiDB(function findByBarejid(msbdb) {
    var r = msbdb.account.findByBarejid(aBarejid);
    if (!r || !r[0]) return null;
    return r[0];
  });
}

function DBFindAllAccount() {
  return callWithMusubiDB(function findAll(msbdb) {
    var r = msbdb.account.findAll();
    if (!r) return null;
    return r;
  });
}

function DBNewAccount(aObj) {
  return callWithMusubiDB(function newAccount(msbdb) {
    var account = new msbdb.account(aObj);
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
    if (!r || !r[0]) return false;
    msbdb.account.deleteById(r[0].id);
    return true;
  });
}
