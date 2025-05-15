import CompanySettings from '../models/companySettings.model.js';

export const getSettings = async (req, res) => {
  try {
    const settings = await CompanySettings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching company settings', error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updated = await CompanySettings.updateSettings(req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating company settings', error: error.message });
  }
}; 