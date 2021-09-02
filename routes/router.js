const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../lib/db');
const userMiddleware = require('../middleware/users');
const productMiddleware = require('../middleware/products');

router.get('/roles', (req, res) => {
  db.query(`SELECT * FROM roles`, (err, result) => {
    if(err) return res.status(400).send({
      msg: 'Error al obtener roles'
    });
    return res.send(result);
  });
})

router.post('/sign-up', userMiddleware.validateRegister, (req, res) => {
  db.query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER(${db.escape(
      req.body.email
    )});`,
    (err, result) => {
      if(err) return res.status(400).send({
        msg: 'Parametros invalidos'
      });

      if (result.length) return res.status(409).send({
        msg: 'Este correo ya esta en uso!'
      });

      bcrypt.hash(req.body.password, 10, (err, hash) => {
        if (err) return res.status(500).send({
          msg: 'No se puede verificar el password'
        });
        
        db.query(
          `INSERT INTO users 
          (username, email, role, password, registered) 
          VALUES (
            ${db.escape(req.body.username)}, 
            ${db.escape(req.body.email)}, 
            ${db.escape(req.body.role)}, 
            ${db.escape(hash)}, 
            now()
          )`,
          (err, ) => {
            if (err) return res.status(400).send({
              msg: 'No se ha podido crear el usuario'
            });
            return res.status(201).send({
              msg: 'Registrado Exitosamente!'
            });
          }
        );
      });
    }
  );
});

router.post('/login', (req, res,) => {
  db.query(
    `SELECT users.id,users.username,
      users.email,users.password,
      roles.id as role_id,roles.name as role_name, 
      roles.post, roles.get, roles.patch, roles.delete
      FROM users
      INNER JOIN roles ON users.role = roles.id
      WHERE LOWER(email) = LOWER(${db.escape(req.body.email)})`,
    (err, result) => {
      if (err) return res.status(400).send({
        msg: 'Error al iniciar sesion',
      });
      if (!result.length) {
        return res.status(401).send({
          msg: 'email o password incorrectos!'
        });
      }
      bcrypt.compare(
        req.body.password,
        result[0]['password'],
        (bErr, bResult) => {
          if (bErr) return res.status(401).send({
            msg: 'email o password incorrectos!'
          });
          if (bResult) {
            const token = jwt.sign({
                id: result[0].id,
                email: result[0].email,
                post: result[0].post,
                get: result[0].get,
                patch: result[0].patch,
                delete: result[0].delete
              },
              'SECRETKEY', {
                expiresIn: '7d'
              }
            );
            db.query(
              `UPDATE users SET last_login = now() 
                WHERE id = ${db.escape(result[0].id)}`
            );
            return res.status(200).send({
              msg: 'Logueado Exitosamente!',
              token,
              user:  {
                id: result[0].id,
                username: result[0].username,
                email: result[0].email,
                role_id: result[0].role_id,
                role_name: result[0].role_name,
                post: result[0].post,
                get: result[0].get,
                patch: result[0].patch,
                delete: result[0].delete
            }
            });
          }
          return res.status(401).send({
            msg: 'email o password incorrectos!'
          });
        }
      );
    }
  );
});

/**Product routes */

router.get('/public_products', (req, res) => {
  db.query(`SELECT id,nombre,inventario,description,SKU,imagen,precio 
    FROM products WHERE inventario > 5`, 
  (err, result) => {
    if (err) return res.status(400).send({
      msg: 'Error al obtener productos'
    });
    res.send(result);
  })
});

router.get('/public_products/:id', 
productMiddleware.validateGetById, 
(req, res) => {
  db.query(`SELECT id,nombre,inventario,description,SKU,imagen 
    FROM products 
    WHERE id = ${db.escape(req.params.id)}`,
  (err, result) => {
    if (err) return res.status(400).send({
      msg: 'Error al obtener informacion del producto'
    });
    res.send(result[0]);
  })
});

router.get('/products', userMiddleware.isLoggedIn, (req, res) => {
  db.query('SELECT * FROM products ORDER BY id DESC', (err, result) => {
    if (err) return res.status(400).send({
      msg: 'Error al obtener productos'
    });
    res.send(result);
  })
});

router.get('/products/:id', 
[userMiddleware.isLoggedIn, productMiddleware.validateGetById], 
(req, res) => {
  db.query(
  `SELECT * FROM products WHERE id = ${db.escape(req.params.id)}`,
  (err, result) => {
    if (err) return res.status(400).send({
      msg: 'Error al obtener producto'
    });
    res.send(result[0]);
  })
});

router.post('/products',
[
  userMiddleware.isLoggedIn,
  productMiddleware.validateProduct,
  productMiddleware.validateProductImage
],
(req, res) => {
  try {
    let imagen = req.files.imagen;
    imagen.mv('./uploads/' + imagen.name);
    db.query(`INSERT INTO products 
      (
        nombre, 
        description, 
        precio, 
        SKU, 
        inventario, 
        imagen, 
        created_by
      ) VALUES (
        ${db.escape(req.body.nombre)},
        ${db.escape(req.body.description)},
        ${db.escape(req.body.precio)},
        ${db.escape(req.body.SKU)},
        ${db.escape(req.body.inventario)},
        ${db.escape(imagen.name)},
        ${db.escape(req.userData.id)}
      )`,
    (err, result) => {
      if(err) return res.status(400).send({
        msg: 'Error al crear producto'
      });
      res.send({
        id: result.insertId,
        msg: 'Producto agregado!'
      });
    });
  } catch(error) {
    res.status(500).send(err);
  }
});

router.patch('/products/:id', 
[
  userMiddleware.isLoggedIn, 
  productMiddleware.validateGetById, 
  productMiddleware.validateProduct
], 
(req, res) => {
  try{
    let sql = `UPDATE products SET`;
    Object.entries(req.body).forEach(([key, value]) => {
      sql += ` ${key}=${db.escape(value)},`;
    });
    //sql = sql.slice(0, -1);
    sql += ` updated_by=${db.escape(req.userData.id)},`;
    if(req.files && req.files.imagen) {
      if(
        req.files.imagen.mimetype === 'image/gif'||
        req.files.imagen.mimetype === 'image/jpeg' ||
        req.files.imagen.mimetype === 'image/png'
      ) {
        let imagen = req.files.imagen;
        imagen.mv('./uploads/' + imagen.name);
        sql += ` imagen=${db.escape(imagen.name)},`;
      }
    }
    sql += ` last_updated=NOW()`;
    sql += ` WHERE id=${db.escape(req.params.id)};`;
    db.query(sql,(err, result) => {
      if(err) return res.status(400).send({
        msg: 'Error al actualizar producto'
      });
      res.send({
        msg: 'Producto actualizado!'
      })
    });
  } catch(error){
    res.status(500).send(err);
  }
});

router.delete('/products/:id', 
[userMiddleware.isLoggedIn, productMiddleware.validateGetById], 
(req, res) => {
  if(req.userData.delete !== 1 ) return res.status(400).send({
    msg: 'Esta cuenta no cuenta con permisos para eliminar'
  });
  db.query(
  `DELETE FROM  products WHERE id = ${db.escape(req.params.id)}`,
  (err, result) => {
    if (err) return res.status(400).send({
      msg: 'Error al eliminar producto'
    });
    res.send({
      msg: 'Producto eliminado!'
    });
  })
});

module.exports = router;