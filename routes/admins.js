const express = require('express')
const router = express.Router()

const layout = './layouts/adminLayout.ejs'

const authController = require('../controller/authController')

router.get('/login', authController.getAdminLogin)

router.get('/register', authController.getAdminRegister)


router.get('/admin/login', (req, res) => {
    res.render('adminLogin', {
        title: 'Auth Page'
    })
})

module.exports = router