// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  console.error(err);
  
  if (err.code === 'auth/email-already-exists') {
    error.message = 'Email already exists';
    error.statusCode = 400;
  }
  
  if (err.code === 'auth/user-not-found') {
    error.message = 'User not found';
    error.statusCode = 404;
  }
  
  if (err.code === 'auth/wrong-password') {
    error.message = 'Invalid credentials';
    error.statusCode = 401;
  }
  
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
  });
};

module.exports = errorHandler;