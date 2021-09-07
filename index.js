const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const router = require('./routes/router');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(fileUpload({
  createParentPath: true
}));
app.use(express.static('./uploads'));
app.use(express.urlencoded({
  extended: true
}));
app.use(cors());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use('/api', router);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));