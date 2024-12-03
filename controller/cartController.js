const Product = require('../model/productSchema');
const Cart = require('../model/cartSchema');
const WishList = require('../model/wishlistSchema');
const User = require('../model/userSchema');

const MAX_QUANTITY_PER_USER = 10;

const addToCart = async (req, res) => {
    try {
        if (req.user) {
            req.session.user_id = req.user._id;
        }
        const userId = req.session.user_id;
        const productId = req.params.productId;
        const { size, quantity } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User not logged in' });
        }
        if (!size || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Size and valid quantity are required' });
        }

        const product = await Product.findById(productId).populate('category');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const today = new Date();
        const productOfferValid = product.offer > 0 && today >= product.offerStart && today <= product.offerEnd;
        const productOfferPrice = productOfferValid
            ? product.price - (product.price * product.offer) / 100
            : product.price;

        const categoryOfferValid = product.category?.offer > 0;
        const categoryOfferPrice = categoryOfferValid
            ? product.price - (product.price * product.category.offer) / 100
            : product.price;

        const finalPrice = Math.min(productOfferPrice, categoryOfferPrice);

        const selectedSize = product.sizes.find(s => s.size === size);
        if (!selectedSize) {
            return res.status(400).json({ message: 'Selected size not available' });
        }
        if (quantity > selectedSize.stock) {
            return res.status(400).json({ message: `Only ${selectedSize.stock} units of this size are available.` });
        }

        let cart = await Cart.findOne({ userId, active: true });
        if (!cart) {
            cart = new Cart({ userId, products: [] });
        }

        const productIndex = cart.products.findIndex(
            p => p.productId.toString() === productId && p.size === size
        );

        let currentQuantity = 0;
        if (productIndex > -1) {
            currentQuantity = cart.products[productIndex].quantity;
        }

        const totalQuantity = currentQuantity + quantity;
        if (totalQuantity > MAX_QUANTITY_PER_USER) {
            return res.status(400).json({
                message: `You can only add up to ${MAX_QUANTITY_PER_USER} units of this product.`
            });
        }

        if (productIndex > -1) {
            cart.products[productIndex].quantity = totalQuantity;
            cart.products[productIndex].price = finalPrice;
        } else {
            const productImage = product.images.length > 0 ? product.images[0].url : '';
            cart.products.push({
                productId: product._id,
                quantity,
                size,
                name: product.name,
                price: finalPrice,
                images: productImage,
            });
        }

        selectedSize.stock -= quantity;

        await product.save();
        await cart.save();

        const cartItemCount = cart.products.reduce((total, product) => total + product.quantity, 0);

        const wishList = await WishList.findOne({ userId });
        if (wishList) {
            const wishListIndex = wishList.products.findIndex(item => item.productId.toString() === productId);
            if (wishListIndex !== -1) {
                wishList.products.splice(wishListIndex, 1);
                await wishList.save();
            }
        }

        res.status(200).json({
            message: 'Product added to cart and removed from wishlist.',
            cartItemCount
        });
    } catch (error) {
        console.error('Error adding product to cart:', error.message);
        res.status(500).json({ message: 'Error adding product to cart' });
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.params.productId;
        const { size, change } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'User not logged in' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const productIndex = cart.products.findIndex(p => p.productId.equals(productId) && p.size === size);
        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        const cartProduct = cart.products[productIndex];
        const newQuantity = cartProduct.quantity + change;

        if (newQuantity < 1) {
            return res.status(400).json({ message: 'Quantity cannot be less than 1' });
        }

        const productDetails = await Product.findById(productId);
        if (!productDetails) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const sizeDetails = productDetails.sizes.find(s => s.size === size);
        if (!sizeDetails) {
            return res.status(404).json({ message: 'Size not found' });
        }

        if (newQuantity > cartProduct.quantity) {
            const increaseBy = newQuantity - cartProduct.quantity;
            if (increaseBy > sizeDetails.stock) {
                return res.status(400).json({
                    message: `Only ${sizeDetails.stock} units available for size ${size}`
                });
            }
            sizeDetails.stock -= increaseBy;
        } else {
            const decreaseBy = cartProduct.quantity - newQuantity;
            sizeDetails.stock += decreaseBy;
        }

        if (newQuantity > MAX_QUANTITY_PER_USER) {
            return res.status(400).json({ message: `Cannot add more than ${MAX_QUANTITY_PER_USER} units` });
        }

        cart.products[productIndex].quantity = newQuantity;

        await productDetails.save();
        await cart.save();

        res.json({ success: true, message: 'Quantity updated successfully' });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const productId = req.params.productId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        let cart = await Cart.findOne({ userId, active: true });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const productIndex = cart.products.findIndex(p => p.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        const cartProduct = cart.products[productIndex];
        const product = await Product.findById(cartProduct.productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found in inventory' });
        }

        const sizeDetails = product.sizes.find(s => s.size === cartProduct.size);
        if (!sizeDetails) {
            return res.status(400).json({ success: false, message: 'Size not found in inventory' });
        }

        sizeDetails.stock += cartProduct.quantity;

        await product.save();
        cart.products.splice(productIndex, 1);
        await cart.save();

        res.status(200).json({
            success: true,
            message: 'Product removed from cart and stock updated',
            cart
        });
    } catch (error) {
        console.error('Error removing product from cart:', error.message);
        res.status(500).json({ success: false, message: 'Error removing product from cart' });
    }
};

const viewCart = async (req, res) => {
    try {
        const userId = req.session.user_id;

        const user = await User.findById(userId);
        const cart = await Cart.findOne({ userId });
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Product', url: '/product' },
            { name: 'Cart', url: '/cart' }
        ];
        res.render('user/cart', { cart, user, breadcrumbs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching cart details' });
    }
};

module.exports = {
    addToCart,
    updateCartQuantity,
    removeFromCart,
    viewCart,
};
