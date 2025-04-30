const Joi = require('joi');
const { sendResponse } = require('./middleware');
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return sendResponse(res, 400, error.details[0].message);
    }
    next();
};
// Joi schemas
const registerSchema = Joi.object({
    name: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    age: Joi.number().integer().min(0).required()
});
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required()
});
const verifyOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp:Joi.number().integer().required()
});
 

module.exports = {
    validate, registerSchema, loginSchema  ,forgotPasswordSchema,verifyOtpSchema
}