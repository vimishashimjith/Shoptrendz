const adminLayout = './layouts/auth/admin/authLayout.ejs'

module.exports = {
    getAdminLogin: async (req,res) => {
        res.render('auth/admin/login', {
            title: 'Auth Page',
            layout: adminLayout
        })
    },
    getAdminRegister: async(req,res) => {
        res.render('auth/admin/register', {
            title: 'Auth Page',
            layout: adminLayout
        })
    }
}