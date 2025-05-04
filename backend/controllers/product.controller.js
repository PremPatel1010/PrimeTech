import Product from '../models/product.model.js';

export const listProducts = async (req, res) => {
  const products = await Product.getAllProducts();
  res.json(products);
};

export const getProductBOM = async (req, res) => {
  const { id } = req.params;
  const product = await Product.getProductWithBOM(id);
  res.json(product);
};


export const createProduct = async (req, res) => {
  try {
    const { product_name, product_code, discharge_range, head_range, rating_range, price } = req.body;
    
    // Validate required fields
    if (!product_name || !product_code || !price) {
      return res.status(400).json({ message: 'Product name, code, and price are required' });
    }

    const product = await Product.createProduct({
      product_name,
      product_code,
      discharge_range,
      head_range,
      rating_range,
      price
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Error in createProduct:', error);
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    console.log(productId)
    const product = await Product.getProductById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error in getProduct:', error);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { product_name, product_code, discharge_range, head_range, rating_range, price } = req.body;

    const updatedProduct = await Product.updateProduct(productId, {
      product_name,
      product_code,
      discharge_range,
      head_range,
      rating_range,
      price
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error in updateProduct:', error);
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const deletedProduct = await Product.deleteProduct(productId);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product deleted successfully',
      product: deletedProduct
    });
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
};

export const addBOMItems = async (req, res) => {
  try {
    const { productId } = req.params;
    const { bomItems } = req.body;

    // Validate BOM items
    if (!Array.isArray(bomItems) || bomItems.length === 0) {
      return res.status(400).json({ message: 'BOM items must be a non-empty array' });
    }

    // Validate each BOM item
    for (const item of bomItems) {
      if (!item.material_id || !item.quantity_required) {
        return res.status(400).json({ 
          message: 'Each BOM item must have material_id and quantity_required' 
        });
      }
    }

    const addedBOMItems = await Product.addBOMItems(productId, bomItems);
    
    res.status(201).json({
      message: 'BOM items added successfully',
      bomItems: addedBOMItems
    });
  } catch (error) {
    console.error('Error in addBOMItems:', error);
    res.status(500).json({ message: 'Error adding BOM items', error: error.message });
  }
}; 
