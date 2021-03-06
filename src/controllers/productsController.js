const Product = require("../models/Product");
const Category = require("../models/Category");
const InexistingIdError = require('../errors/InexistingIdError');
const CategoryProduct = require("../models/CategoryProduct");
const ProductOrder = require("../models/ProductOrder");
const Photo = require("../models/Photo");
const photosController = require('../controllers/photosController');

async function postProduct(productData) {

    await _checkIfExistsAllCategories(productData.categories);

    const { name, author, synopsis, amountStock, pages, year, price } = productData;
    const product =  await Product.create( {name, author, synopsis, amountStock, pages, year, price} );
  
    await _addCategoriesProductsInMiddleTable(productData.categories, product.id);
    
    await photosController.postPhotos(productData.photos, product.id)

    const productAllData = await getProductById(product.id);
    return productAllData;
}

async function getAllProducts() {

    const products = await Product.findAll({
        include: [
        {
            model: Photo,
            attributes: ['id', 'link']
        },
        {
            model: Category,
            attributes: ['id'],
        }
        ],
    });
    
    return products;
}

async function getTopSellingProducts() {
    const products = await Product.findAll({
        include: [
            {
                model: Photo,
                attributes: ['id', 'link']
            },
            {
                model: Category,
                attributes: ['id', 'name'],
                through: {
                    attributes: [],
                }
            },
            {
                model: ProductOrder,
                attributes: []
            }
        ],
        order: [  
            [ { model: ProductOrder}, 'id', 'DESC'],
        ]
    });

    return products.filter( (p,i) => i < 4);
}

async function getAllProductsByCategory(categoryId) {

    const existThisCategoryId = await Category.findOne( {where: { id: categoryId} } );
    if(!existThisCategoryId) throw new InexistingIdError();

    const categoryWithItsProducts =  await Category.findOne( 
        {
            where: {id: categoryId},
            include: {
                        model: Product,
                        attributes: ['id','name', 'author', 'synopsis', 'amountStock', 'pages', 'year', 'price'],
                        through: {
                            attributes: []
                        },
                        include: [
                            {
                                model: Photo,
                                attributes: ['id', 'link']
                            },
                            {
                                model: Category,
                                attributes: ['id', 'name'],
                                through: {
                                    attributes: [],
                                }
                            }
                        ]
            },
        });
    return categoryWithItsProducts;
}

async function getProductById(id) {

    const product =  await Product.findOne({
        where: { id },
        include: [
            {
                model: Photo,
                attributes: ['id', 'link']
            },
            {
                model: Category,
                attributes: ['id', 'name'],
                through: {
                    attributes: [],
                }
            }
        ]
    });
    if (!product) {
        throw new InexistingIdError();
    }
    return product;
}

async function getProductForAdminById(id) {

    const product =  await Product.findOne({
        where: { id },
        include: [
            {
                model: Photo,
                attributes: ['id']
            },
            {
                model: Category,
                attributes: ['id'],
                through: {
                    attributes: [],
                }
            }
        ]
    });
    if (!product) {
        throw new InexistingIdError();
    }
    const arrayIdPhotos = product.photos.map(photo => photo.id);
    const arrayIdCtegories = product.categories.map(c => c.id);
    const productFormated = {
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "author": product.author,
        "year": product.year,
        "synopsis": product.synopsis,
        "pages": product.pages,
        "amountStock": product.amountStock,
        "photosIds": arrayIdPhotos, 
        "categories": arrayIdCtegories 
    };
    return productFormated;
}


async function getProductsAdmin() {

    const products =  await Product.findAll({
        include: [
            {
                model: Photo,
                attributes: ['id']
            },
            {
                model: Category,
                attributes: ['id'],
                through: {
                    attributes: [],
                }
            }
        ]
    });

    const productsFormatted = products.map((element) => {
        const arrayIdPhotos = element.photos.map(photo => photo.id);
        const arrayIdCategories = element.categories.map(c => c.id);
        const productFormated = {
            "id": element.id,
            "name": element.name,
            "price": element.price,
            "author": element.author,
            "year": element.year,
            "synopsis": element.synopsis,
            "pages": element.pages,
            "amountStock": element.amountStock,
            "photosIds": arrayIdPhotos, 
            "categories": arrayIdCategories 
        };
        return productFormated;
    })

    return productsFormatted;
}

async function deleteProduct(id) {

    await checkIfProductIdExists(id);

    await Photo.destroy( { where: { productId:id} } );
    await CategoryProduct.destroy( { where: { productId:id} } );
    await ProductOrder.destroy( { where: { productId:id} } );
    await Product.destroy( {where: {id} });
}

async function updateProduct(productData, id) {

    const product =  await checkIfProductIdExists(id);

    if (productData.categories) {
        await _checkIfExistsAllCategories(productData.categories);
        await CategoryProduct.destroy( { where: { "productId": id} } );
        await _addCategoriesProductsInMiddleTable(productData.categories, id);
    }

    if (productData.photos) {
        await photosController.postPhotos(productData.photos, id);
    }

    const { name, author, synopsis, amountStock, pages, year, price } = productData;
    
    product.name = name || product.name;
    product.author = author || product.author;
    product.synopsis = synopsis || product.synopsis;
    product.amountStock = amountStock || product.amountStock;
    product.pages = pages || product.pages;
    product.year = year || product.year;
    product.price = price || product.price;
    await product.save();

    const updatedProductAllData = await getProductById(product.id);
    return updatedProductAllData;
}

async function _checkIfExistsAllCategories(categories) {

    const allCategories = await Category.findAll({ where: {id: categories } });
        if (allCategories.length !== categories.length ) {
            throw new InexistingIdError();
        }
}

async function checkIfProductIdExists(id) {

    const product = await Product.findOne( { where: {id} } );
    if(!product) throw new InexistingIdError();
    return product;
}

async function _addCategoriesProductsInMiddleTable(categoriesIds, productId) {
    const arrayInsertMiddleTableCategory = categoriesIds.map( c => { 
        return {"productId": productId, "categoryId": c }
    });
    await CategoryProduct.bulkCreate( arrayInsertMiddleTableCategory );
}

async function decrementProductStock(productId, decrement) {
    const product =  await checkIfProductIdExists(productId);

    product.amountStock = product.amountStock - decrement;
    if (product.amountStock < 0) {
        product.amountStock = 0;
    }
    await product.save();
    return product;
}

module.exports = {
    postProduct,
    getAllProducts,
    getProductsAdmin,
    getAllProductsByCategory,
    getProductById,
    deleteProduct,
    updateProduct,
    getTopSellingProducts,
    decrementProductStock,
    checkIfProductIdExists,
    getProductForAdminById,
}