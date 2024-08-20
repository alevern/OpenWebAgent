db = connect("mongodb://mgadmin:mgpasswd@owa-mongo:27017/admin");

db = db.getSiblingDB('owa-db');
db.createUser({
  user: "owa-server",
  pwd: "owa-secretpasswd",
  roles: [{ role: "readWrite", db: "owa-db" }]
});
