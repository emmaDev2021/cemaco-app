const jwt = require("jsonwebtoken");

module.exports = {
  validateRegister: (req, res, next) => {
    if (!req.body.username || req.body.username.length < 3) {
      return res.status(400).send({
        msg: 'Nombre de usuario debe de ser al menos 3 caracteres de largo'
      });
    }
    if (!req.body.password || req.body.password.length < 6) {
      return res.status(400).send({
        msg: 'Password debe de ser al menos 6 caracters de largo'
      });
    }
    if (
      !req.body.password_repeat ||
      req.body.password != req.body.password_repeat
    ) {
      return res.status(400).send({
        msg: 'Ambos passwords deben coincidir'
      });
    }
    next();
  },
  isLoggedIn: (req, res, next) => {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        'SECRETKEY'
      );
      req.userData = decoded;
      next();
    } catch (err) {
      return res.status(401).send({
        msg: 'Sesion invalida!'
      });
    }
  }
};