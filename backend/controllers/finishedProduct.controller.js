import FinishedProduct from '../models/finishedProduct.model.js';

// Get all finished products
export const getAllFinishedProducts = async (req, res) => {
  try {
    const products = await FinishedProduct.getAllFinishedProducts();
    res.json(products);
  } catch (error) {
    console.error('Error in getAllFinishedProducts:', error);
    res.status(500).json({ message: 'Error fetching finished products' });
  }
};

// Get finished product by ID
export const getFinishedProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await FinishedProduct.getFinishedProductById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Finished product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error in getFinishedProductById:', error);
    res.status(500).json({ message: 'Error fetching finished product' });
  }
};

// Create finished product
export const createFinishedProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // Validate required fields
    if (!productData.product_id || !productData.quantity_available) {
      return res.status(400).json({ 
        message: 'Product ID and quantity are required' 
      });
    }

    const newProduct = await FinishedProduct.createFinishedProduct(productData);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error in createFinishedProduct:', error);
    res.status(500).json({ message: 'Error creating finished product' });
  }
};

// Update finished product
export const updateFinishedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedProduct = await FinishedProduct.updateFinishedProduct(id, updateData);
    
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Finished product not found' });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error in updateFinishedProduct:', error);
    res.status(500).json({ message: 'Error updating finished product' });
  }
};

// Delete finished product
export const deleteFinishedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRows = await FinishedProduct.deleteFinishedProduct(id);
    if (!deletedRows || deletedRows.length === 0) {
      return res.status(404).json({ message: 'No finished product(s) found for this product ID' });
    }
    res.json({ message: 'All finished product inventory for this product has been deleted.' });
  } catch (error) {
    console.error('Error in deleteFinishedProduct:', error);
    res.status(500).json({ message: 'Error deleting finished product' });
  }
};

// Update quantity
export const updateQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantityChange } = req.body;

    if (typeof quantityChange !== 'number') {
      return res.status(400).json({ 
        message: 'Quantity change must be a number' 
      });
    }

    const updatedProduct = await FinishedProduct.updateQuantity(id, quantityChange);
    
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Finished product not found' });
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error in updateQuantity:', error);
    if (error.message === 'Insufficient quantity available') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error updating quantity' });
  }
};

// Get product inventory
export const getProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const inventory = await FinishedProduct.getProductInventory(productId);
    res.json(inventory);
  } catch (error) {
    console.error('Error in getProductInventory:', error);
    res.status(500).json({ message: 'Error fetching product inventory' });
  }
}; 