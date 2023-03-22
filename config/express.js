const swaggerJSDoc = require('swagger-jsdoc')

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Auth AFPA TONY API',
      version: '0.7.0',
    }
}
const optionsSwagger = {
    swaggerDefinition,
    apis: ['./index.js'],
}
const swaggerSpec = swaggerJSDoc(optionsSwagger)

module.exports = {
    swaggerSpec
}