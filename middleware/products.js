const Joi = require('joi');

module.exports = {
  validateGetById: (req, res, next) => {
    const id = parseInt(req.params.id);
    if(isNaN(id)) return res.status(400).send({
      msg: 'Producto invalido'
    });
    next();
  },
  validateProduct: (req, res, next) => {
    const schema = Joi.object({
      nombre: Joi.string().max(100).required(),
      description: Joi.string().max(200).required(),
      precio: Joi.string().regex(/^(0|[1-9]\d*)(\.\d+)?$/).required(),
      SKU: Joi.string().alphanum().required(),
      inventario: Joi.number().integer().min(0).required(),
      //imagen: Joi.string().required(),
      created_by: Joi.number().integer().min(1),
      updated_by: Joi.number().integer().min(1),
    })
    const {error} = schema.validate(req.body);
    if(error) return res.status(400).send(error.details[0].message);
    next();
  },
  validateProductImage: (req, res, next) => {
    if(!req.files || !req.files.imagen) res.status(400).send({
      msg: 'Se requiere la imagen del producto'
    });
    if(
      req.files.imagen.mimetype !== 'image/gif' &&
      req.files.imagen.mimetype !== 'image/jpeg' &&
      req.files.imagen.mimetype !== 'image/png'
    ) res.status(400).send({
      msg: 'formato de archivo invalido el archivo debe ser: (gif, jpeg, png)'
    });
    next()
  }
};