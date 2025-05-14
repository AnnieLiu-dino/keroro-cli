'use strict'

const axios = require('axios')

const BASE_URL = process.env.I18N_BASE_URL
    ? process.env.I18N_BASE_URL
    : 'http://annie.com'

const request = axios.create({
    baseURL: BASE_URL,
    timeout: 5000,
})

request.interceptors.request.use(
    (request) => {
        logger.debug('proxy -request', request)
    },
    (error) => {
        console.log('proxy -error', error)
        return Promise.reject(error)
    },
)
request.interceptors.response.use(
    (response) => {
        // logger.debug("proxy -response", response);
    },
    (error) => {
        // logger.debug("proxy -error", error);
        return Promise.reject(error)
    },
)

module.exports = request
