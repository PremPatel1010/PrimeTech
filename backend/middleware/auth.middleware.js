import User from '../models/user.model.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = User.verifyToken(token);
    
    const user = await User.findById(decoded.userId);
    

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    
    next();
  } catch (error) {
    console.log(error) 
    return res.status(401).json({ message: 'Invalid token' });
    
  }
};

export const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
}; 