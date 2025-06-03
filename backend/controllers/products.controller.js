import Product from '../models/products.model.js';
import RawMaterial from '../models/rawmaterials.model.js';

const productController = {
  // Get all products
  async getAllProducts(req, res) {
    try {
      const products = await Product.findAll();
      res.json({
        success: true,
        data: products,
        message: 'Products retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching products',
        error: error.message
      });
    }
  },

  // Get single product by ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.json({
        success: true,
        data: product,
        message: 'Product retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching product',
        error: error.message
      });
    }
  },

  // Create new product
  async createProduct(req, res) {
    try {
      const productData = req.body;
      
      // Validation
      if (!productData.name || !productData.productCode) {
        return res.status(400).json({
          success: false,
          message: 'Product name and code are required'
        });
      }
      
      const product = await Product.create(productData);
      
      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error) {
      console.error('Error creating product:', error);
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Product code already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error creating product',
        error: error.message
      });
    }
  },

  // Update existing product
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const productData = req.body;
      
      const product = await Product.update(id, productData);
      
      res.json({
        success: true,
        data: product,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Error updating product:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Product code already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating product',
        error: error.message
      });
    }
  },

  // Delete product
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      
      await Product.delete(id);
      
      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      
      if (error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deleting product',
        error: error.message
      });
    }
  },

  // Add sub-component to product
  async addSubComponent(req, res) {
    try {
      const { id } = req.params;
      const subComponentData = req.body;
      
      if (!subComponentData.name) {
        return res.status(400).json({
          success: false,
          message: 'Sub-component name is required'
        });
      }
      
      const product = await Product.addSubComponent(id, subComponentData);
      
      res.json({
        success: true,
        data: product,
        message: 'Sub-component added successfully'
      });
    } catch (error) {
      console.error('Error adding sub-component:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding sub-component',
        error: error.message
      });
    }
  },

  // Update sub-component
  async updateSubComponent(req, res) {
    try {
      const { id, subComponentId } = req.params;
      const subComponentData = req.body;

      const product = await Product.updateSubComponent(id, subComponentId, subComponentData);

      res.json({
        success: true,
        data: product,
        message: 'Sub-component updated successfully' 
      });
    } catch (error) {
      console.error('Error updating sub-component:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating sub-component',
        error: error.message
      });
    }
  },

  // Delete sub-component
  async deleteSubComponent(req, res) {
    try {
      const { id, subComponentId } = req.params;

      const product = await Product.deleteSubComponent(id, subComponentId);

      res.json({
        success: true,
        data: product,
        message: 'Sub-component deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting sub-component:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting sub-component',
        error: error.message
      });
    }
  },

  // Update material in sub-component
  async updateMaterial(req, res) {
    try {
      const { id, subComponentId, materialId } = req.params;
      const materialData = req.body;

      const product = await Product.updateMaterial(id, subComponentId, materialId, materialData);

      res.json({
        success: true,
        data: product,
        message: 'Material updated successfully'
      });
    } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating material',
        error: error.message
      });
    }
  },

  // Delete material from sub-component
  async deleteMaterial(req, res) {
    try {
      const { id, subComponentId, materialId } = req.params;

      const product = await Product.deleteMaterial(id, subComponentId, materialId);
      
      res.json({
        success: true,
        data: product,
        message: 'Material deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting material:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting material',
        error: error.message
      });
    }
  },

  // Add material to sub-component
  async addMaterialToSubComponent(req, res) {
    try {
      const { id, subComponentId } = req.params;
      const materialData = req.body;
      
      if (!materialData.materialId || !materialData.quantityRequired) {
        return res.status(400).json({
          success: false,
          message: 'Material ID and quantity are required'
        });
      }
      
      const product = await Product.addMaterialToSubComponent(id, subComponentId, materialData);
      
      res.json({
        success: true,
        data: product,
        message: 'Material added to sub-component successfully'
      });
    } catch (error) {
      console.error('Error adding material to sub-component:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding material to sub-component',
        error: error.message
      });
    }
  },

  // Get all raw materials
  async getAllRawMaterials(req, res) {
    try {
      const materials = await RawMaterial.findAll();
      res.json({
        success: true,
        data: materials,
        message: 'Raw materials retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching raw materials',
        error: error.message
      });
    }
  },

  // Get low stock materials
  async getLowStockMaterials(req, res) {
    try {
      const materials = await RawMaterial.getLowStockMaterials();
      res.json({
        success: true,
        data: materials,
        message: 'Low stock materials retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching low stock materials:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching low stock materials',
        error: error.message
      });
    }
  },

  // Create raw material
  async createRawMaterial(req, res) {
    try {
      const materialData = req.body;
      
      if (!materialData.name || !materialData.unit) {
        return res.status(400).json({
          success: false,
          message: 'Material name and unit are required'
        });
      }
      
      const material = await RawMaterial.create(materialData);
      
      res.status(201).json({
        success: true,
        data: material,
        message: 'Raw material created successfully'
      });
    } catch (error) {
      console.error('Error creating raw material:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating raw material',
        error: error.message
      });
    }
  },

  // Update material stock
  async updateMaterialStock(req, res) {
    try {
      const { materialId } = req.params;
      const { newStock } = req.body;
      
      if (newStock === undefined || newStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid stock quantity is required'
        });
      }
      
      const material = await RawMaterial.updateStock(materialId, newStock);
      
      res.json({
        success: true,
        data: material,
        message: 'Material stock updated successfully'
      });
    } catch (error) {
      console.error('Error updating material stock:', error);
      
      if (error.message === 'Raw material not found') {
        return res.status(404).json({
          success: false,
          message: 'Raw material not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error updating material stock',
        error: error.message
      });
    }
  },

  // Get product manufacturing steps
  async getProductManufacturingSteps(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.json({
        success: true,
        data: product.manufacturingSteps,
        message: 'Manufacturing steps retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching manufacturing steps:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching manufacturing steps',
        error: error.message
      });
    }
  },

  // Add manufacturing step to product
  async addManufacturingStep(req, res) {
    try {
      const { id } = req.params;
      const stepData = req.body;
      
      if (!stepData.name || !stepData.sequence) {
        return res.status(400).json({
          success: false,
          message: 'Step name and sequence are required'
        });
      }
      
      const product = await Product.addManufacturingStep(id, stepData);
      
      res.status(201).json({
        success: true,
        data: product,
        message: 'Manufacturing step added successfully'
      });
    } catch (error) {
      console.error('Error adding manufacturing step:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding manufacturing step',
        error: error.message
      });
    }
  },

  // Update manufacturing step
  async updateManufacturingStep(req, res) {
    try {
      const { id, stepId } = req.params;
      const stepData = req.body;
      
      const product = await Product.updateManufacturingStep(id, stepId, stepData);
      
      res.json({
        success: true,
        data: product,
        message: 'Manufacturing step updated successfully'
      });
    } catch (error) {
      console.error('Error updating manufacturing step:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating manufacturing step',
        error: error.message
      });
    }
  },

  // Delete manufacturing step
  async deleteManufacturingStep(req, res) {
    try {
      const { id, stepId } = req.params;
      
      const product = await Product.deleteManufacturingStep(id, stepId);
      
      res.json({
        success: true,
        data: product,
        message: 'Manufacturing step deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting manufacturing step:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting manufacturing step',
        error: error.message
      });
    }
  },

  // Get sub-component manufacturing steps
  async getSubComponentManufacturingSteps(req, res) {
    try {
      const { id, subComponentId } = req.params;
      const product = await Product.findById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      const subComponent = product.subComponents.find(sc => sc.id === subComponentId);
      if (!subComponent) {
        return res.status(404).json({
          success: false,
          message: 'Sub-component not found'
        });
      }
      
      res.json({
        success: true,
        data: subComponent.manufacturingSteps,
        message: 'Sub-component manufacturing steps retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching sub-component manufacturing steps:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching sub-component manufacturing steps',
        error: error.message
      });
    }
  },

  // Add manufacturing step to sub-component
  async addSubComponentManufacturingStep(req, res) {
    try {
      const { id, subComponentId } = req.params;
      const stepData = req.body;
      
      if (!stepData.name || !stepData.sequence) {
        return res.status(400).json({
          success: false,
          message: 'Step name and sequence are required'
        });
      }
      
      const product = await Product.addSubComponentManufacturingStep(id, subComponentId, stepData);
      
      res.status(201).json({
        success: true,
        data: product,
        message: 'Sub-component manufacturing step added successfully'
      });
    } catch (error) {
      console.error('Error adding sub-component manufacturing step:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding sub-component manufacturing step',
        error: error.message
      });
    }
  },

  // Update sub-component manufacturing step
  async updateSubComponentManufacturingStep(req, res) {
    try {
      const { id, subComponentId, stepId } = req.params;
      const stepData = req.body;
      
      const product = await Product.updateSubComponentManufacturingStep(id, subComponentId, stepId, stepData);
      
      res.json({
        success: true,
        data: product,
        message: 'Sub-component manufacturing step updated successfully'
      });
    } catch (error) {
      console.error('Error updating sub-component manufacturing step:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating sub-component manufacturing step',
        error: error.message
      });
    }
  },

  // Delete sub-component manufacturing step
  async deleteSubComponentManufacturingStep(req, res) {
    try {
      const { id, subComponentId, stepId } = req.params;
      
      const product = await Product.deleteSubComponentManufacturingStep(id, subComponentId, stepId);
      
      res.json({
        success: true,
        data: product,
        message: 'Sub-component manufacturing step deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting sub-component manufacturing step:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting sub-component manufacturing step',
        error: error.message
      });
    }
  }
};

export default productController;