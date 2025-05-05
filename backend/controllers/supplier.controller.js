import Supplier from '../models/supplier.model.js';

// Get all suppliers
export const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.getAllSuppliers();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
};

// Get a single supplier
export const getSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    
    if (!supplierId || isNaN(parseInt(supplierId))) {
      return res.status(400).json({ message: 'Invalid supplier ID' });
    }

    const supplier = await Supplier.getSupplierById(supplierId);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching supplier', error: error.message });
  }
};

// Create a new supplier
export const createSupplier = async (req, res) => {
  try {
    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      gst_number
    } = req.body;

    // Validate required fields
    if (!supplier_name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone format if provided
    if (phone && !/^[0-9+\-\s()]{10,15}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Validate GST number format if provided
    if (gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst_number)) {
      return res.status(400).json({ message: 'Invalid GST number format' });
    }

    const supplierData = {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      gst_number
    };

    const supplier = await Supplier.createSupplier(supplierData);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error creating supplier', error: error.message });
  }
};

// Update a supplier
export const updateSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    
    if (!supplierId || isNaN(parseInt(supplierId))) {
      return res.status(400).json({ message: 'Invalid supplier ID' });
    }

    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      gst_number
    } = req.body;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone format if provided
    if (phone && !/^[0-9+\-\s()]{10,15}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Validate GST number format if provided
    if (gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst_number)) {
      return res.status(400).json({ message: 'Invalid GST number format' });
    }
    const updateData = {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      gst_number
    };

    const supplier = await Supplier.updateSupplier(supplierId, updateData);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error updating supplier', error: error.message });
  }
};

// Delete a supplier
export const deleteSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    
    if (!supplierId || isNaN(parseInt(supplierId))) {
      return res.status(400).json({ message: 'Invalid supplier ID' });
    }

    const supplier = await Supplier.deleteSupplier(supplierId);
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting supplier', error: error.message });
  }
}; 