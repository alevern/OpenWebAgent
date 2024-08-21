db = db.getSiblingDB('owadb');
db.createUser({
  user: "owaserver",
  pwd: "owapasswd",
  roles: [{ role: "readWrite", db: "owadb" }]
});

db.createCollection('apps')

db.apps.insertOne({
  active: true,
});
