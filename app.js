
 
//npm init -y
//npm install express

//npm install pg
// npnm install dotenv
// npm install date-fns



import express from 'express';
import router from './router/router.js';  
import { dbExecution } from "./dbconfig/dbconfig.js";


const app = express();
const PORT = 9999;
 
app.use('/api', router);

app.get('/', (req, res) => {

  res.send('Hello, World!');

});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});












