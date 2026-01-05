import multer from 'multer';
  
const storage = multer.diskStorage({
 
  destination: function (req, file, cb) {
  
    cb(null, './productImage');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'sell-' + uniqueSuffix + '-' + file.originalname); 
  }
});
 
export const uploadImage = multer({ storage: storage }).array('files', 5);
