import multer from "multer";

// ✅ Storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './refillwalletImage'); // your folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'sell-' + uniqueSuffix + '-' + file.originalname); 
  }
});

// ✅ Raw multer instance
const upload = multer({ storage });

// ✅ Export the instance, do NOT call .array() here
export default upload;
