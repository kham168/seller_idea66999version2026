import { dbExecution } from "../../dbconfig/dbconfig.js";
 

export const adminLogin = async (req, res) => {
  const { gmail, password } = req.body; // 👈 safer than params for login

  if (!gmail || !password) {
    return res.status(400).send({
      status: false,
      message: "Missing gmail or password",
      data: [],
    });
  }
 
  try {
    // 1️⃣ Query member by gmail
    const query = `
    SELECT id, name, usertype, gmail, password
	FROM public.tbadminuser where id=$1 and status='1';
    `;

    const result = await dbExecution(query, [gmail]);

    // 2️⃣ Check if user exists
    if (!result || result.rowCount === 0) {
      return res.status(401).send({
        status: false,
        message: "Invalid email or password",
        data: [],
      });
    }

    const user = result.rows[0];

    // 3️⃣ Compare input password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).send({
        status: false,
        message: "Invalid email or password",
        data: [],
      });
    }

    // ✅ 4️⃣ Login successful
    // (Optional) Remove password from response
    delete user.password;

    return res.status(200).send({
      status: true,
      message: "Login successful",
      data: user,
    });
  } catch (error) {
    console.error("Error in memberLogin:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const queryAdminData = async (req, res) => {
  const id = req.query.id ?? 0;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member id",
      data: [],
    });
  }

  try {
   
    const querySelect = `
    SELECT id, name, lastname, gender, usertype, gmail,
password, wallet, customergroup, status, cdate
	FROM public.tbadminuser where id=$1;
    `;

    const selectResult = await dbExecution(querySelect, [id]);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(200).send({
        status: true,
        message: "No data found",
        data: [],
      });
    }

    // ✅ Response
    return res.status(200).send({
      status: true,
      message: "Query successful", 
      data: selectResult.rows,
    });
  } catch (error) {
    console.error("Error in queryMemberData:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};


export const admin_register = async (req, res) => {
  const { 	id, name, gmail } = req.body;

  if (!id || !password || !gmail) {
    return res.status(400).send({
      status: false,
      message: "Missing required fields: id, gmail, or password",
      data: [],
    });
  }
 
  try {
    // ✅ 2. Check if Gmail already exists
    const checkMailQuery = `
      SELECT COUNT(*) AS qty
      FROM public.tbmember
      WHERE gmail = $1 AND status = '1';
    `;
    const checkResult = await dbExecution(checkMailQuery, [gmail]);

    const existingCount = parseInt(checkResult.rows[0].qty, 10);

    if (existingCount > 0) {
      return res.status(400).send({
        status: false,
        message: "This email is already exists",
        data: [],
      });
    }

    // ✅ 3. Encrypt the password before insert
    const saltRounds = 16;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ✅ 4. Insert new member
    const insertQuery = `
     INSERT INTO public.tbadminuser(
	id, name, usertype, gmail, password , status, cdate)
	VALUES ($1, $2, 'admin', $3, $4, '1',NEW());
      RETURNING *;
    `;

    const values = [id, name, gmail, hashedPassword];
    const result = await dbExecution(insertQuery, values);

    if (!result || result.rowCount === 0) {
      return res.status(400).send({
        status: false,
        message: "Insert failed",
        data: [],
      });
    }

    // ✅ 5. Success
    return res.status(200).send({
      status: true,
      message: "Member registered successfully",
      data: {
        ...result.rows[0],
        password: "ENCRYPTED", // Hide the actual hash
      },
    });
  } catch (error) {
    console.error("Error in member_register:", error);
    return res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const UpdateAdminStatus = async (req, res) => {

  const { id, status } = req.body;
  
  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member ID",
      data: [],
    });
  }

  try {
     
    // ✅ Update the member's profile image (just first image)
    const UpdateUserStatus = `
    UPDATE public.tbadminuser
	SET status=$s2
	WHERE id=$1
      RETURNING *;
    `;

    const result = await dbExecution(UpdateUserStatus, [id, status]);

    if (!result || result.rowCount === 0) {
      return res.status(404).send({
        status: false,
        message: "user not found or update failed",
        data: [],
      });
    }

    return res.status(200).send({
      status: true,
      message: "Updated status successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error in memberUpdateImageProfile:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};

export const queryAdminAll = async (req, res) => {
  const id = req.query.id ?? 0;

  if (!id) {
    return res.status(400).send({
      status: false,
      message: "Missing member id",
      data: [],
    });
  }

  try {
   
    const querySelect = `
    SELECT id, name, lastname, gender, usertype, gmail, status, cdate
	FROM public.tbadminuser order by cdate desc;
    `;

    const selectResult = await dbExecution(querySelect, []);

    if (!selectResult || selectResult.rowCount === 0) {
      return res.status(200).send({
        status: true,
        message: "No data found",
        data: [],
      });
    }

    // ✅ Response
    return res.status(200).send({
      status: true,
      message: "Query successful", 
      data: selectResult.rows,
    });
  } catch (error) {
    console.error("Error in queryMemberData:", error);
    res.status(500).send({
      status: false,
      message: "Internal Server Error",
      error: error.message,
      data: [],
    });
  }
};
