var admin = require("firebase-admin");

var serviceAccount = require("../config/firebaseServiceKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ducketapp.firebaseio.com"
});
database = admin.database();  