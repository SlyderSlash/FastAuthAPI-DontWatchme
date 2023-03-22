const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const firstStart = require('./firstStart')
const {swaggerSpec} = require('./config/express')
const swaggerUi = require('swagger-ui-express')
const apikeyMiddleware = require('./middleware/apikey')

const config = require('./config/multer');
const db = new sqlite3.Database('database.sqlite');
const dbkey = new sqlite3.Database('dbAPIKey.sqlite');

const app = express();
app.use(bodyParser.json());
if(process.env.NODE_ENV == "dev"){
  app.post('/apikeys', (req, res) => {
    const { name } = req.body;
  
    // Vérifie que le nom et la limite ont été fournis
    if (!name) {
      return res.status(400).json({ error: 'Missing name or limit' });
    }
  
    // Génère une nouvelle clé API aléatoire
    const apiKey = jwt.sign({}, 'HNEFOUE45EZFEZ1F5E1FZE5FZFEZF', { expiresIn: '1M' });
  
    // Ajoute la nouvelle clé API dans la base de données
    const sql = 'INSERT INTO api_keys (api_key, name, calls) VALUES (?, ?, ?)';
    dbkey.run(sql, [apiKey, name, 0], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
  
      // Retourne la nouvelle clé API générée
      res.status(201).json({ apiKey });
    });
  });
}
if(process.env.NODE_ENV == "prod"){
  app.post('/apikeys', (_req, res) => {
    return res.status(401).json({ error: 'Not authaurized' })
  })
}


app.get('/start', (req, res)=> {
    firstStart(dbkey, db)
    res.send({message : 'ok'})
})

/** 
 * @openapi
 * /Docs:
 *   get:
 *     tags:
 *      - Pages
 *     description: Swagger docs page - Talk about the API
 *     responses:
 *       200:
 *         description: Return The Swagger Page
*/
app.use('/Docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use(apikeyMiddleware);
app.get('/protected', (_req, res) => {
    res.json({ message: 'Protected route' });
  });


const upload = multer({ dest: config });

app.listen(3256, () => {
  console.log(`Server started on port ${3256} - in ${process.env.NODE_ENV} Mode`);
});



// Routes d'authentification


app.post('/signup', upload.single('profilePicture'), (req, res) => {
  const { username, email, password, description } = req.body;
  const profilePicture = req.file ? req.file.filename : null;

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const sql = 'INSERT INTO users (username, email, password, description, profilePicture) VALUES (?, ?, ?, ?, ?)';
    const values = [username, email, hash, description, profilePicture];

    db.run(sql, values, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const user = { id: this.lastID, username, email };
      const token = jwt.sign(user, 'OKILHYGHYDUJ8078047124BJIG412B4Y294HO2H94U21I4HB2194', { expiresIn: '1h' });

      res.json({ user, token });
    });
  });
});
/** 
 * @openapi
 * /login:
 *   post:
 *     summary: Login user
 *     description: Login a user with email and password
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: email
 *         in: body
 *         required: true
 *         description: User's email
 *         type: string
 *       - name: password
 *         in: body
 *         required: true
 *         description: User's password
 *         type: string
 *     responses:
 *       200:
 *         description: Logged in successfully
 *         schema:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: User's id
 *                 username:
 *                   type: string
 *                   description: User's username
 *                 email:
 *                   type: string
 *                   description: User's email
 *             token:
 *               type: string
 *               description: Access token
 *       401:
 *         description: Invalid email or password
 *         schema:
 *           type: object
 *           properties:
 *             error:
 *               type: string
 *               description: Error message
 *       500:
 *         description: Internal server error
 *         schema:
 *           type: object
 *           properties:
 *             error:
 *               type: string
 *               description: Error message
 */
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ?';
  const values = [email];

  db.get(sql, values, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    bcrypt.compare(password, row.password, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!result) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = { id: row.id, username: row.username, email: row.email };
      const token = jwt.sign(user, config.jwtSecret, { expiresIn: '1h' });

      res.json({ user, token });
    });
  });
});
/** 
 * @openapi
 * /profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     description:
 *                       type: string
 *                     profilePicture:
 *                       type: string
 *         example:
 *           user:
 *             id: 1
 *             username: john_doe
 *             email: john_doe@example.com
 *             description: Hello, I'm John Doe
 *             profilePicture: https://example.com/profile.jpg
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
app.get('/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const sql = 'SELECT * FROM users WHERE id = ?';
    const values = [decoded.id];

    db.get(sql, values, (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!row) {
        return res.status(401).json({ error: 'User not found' });
}
  const { id, username, email, description, profilePicture } = row;
  const user = { id, username, email, description, profilePicture };
  
  res.json({ user });
});
});
});
/** 
 * @openapi
 * /profile:
 *   put:
 *     summary: Update the user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               description:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: The updated user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                   description: The ID of the updated user
 *                 username:
 *                   type: string
 *                   description: The new username of the user
 *                 email:
 *                   type: string
 *                   description: The new email of the user
 *                 description:
 *                   type: string
 *                   description: The new description of the user
 *                 profilePicture:
 *                   type: string
 *                   description: The new profile picture filename of the user
 *       '400':
 *         description: At least one field must be updated
 *       '401':
 *         description: Invalid or missing token
 *       '500':
 *         description: Internal server error
 *
 * @param {object} req - The request object
 * @param {object} req.headers - The request headers
 * @param {string} req.headers.authorization - The authorization header containing the bearer token
 * @param {object} req.body - The request body
 * @param {string} [req.body.username] - The new username of the user
 * @param {string} [req.body.email] - The new email of the user
 * @param {string} [req.body.password] - The new password of the user
 * @param {string} [req.body.description] - The new description of the user
 * @param {object} req.file - The uploaded file object
 * @param {string} req.file.filename - The filename of the uploaded file
 * @param {object} res - The response object
 */
app.put('/profile', upload.single('profilePicture'), (req, res) => {
const authHeader = req.headers.authorization;
const token = authHeader && authHeader.split(' ')[1];

if (!token) {
return res.status(401).json({ error: 'Authorization header missing' });
}

jwt.verify(token, config.jwtSecret, (err, decoded) => {
if (err) {
return res.status(401).json({ error: 'Invalid token' });
}
const { id } = decoded;
const { username, email, password, description } = req.body;
const profilePicture = req.file ? req.file.filename : null;

if (!username && !email && !password && !description && !profilePicture) {
  return res.status(400).json({ error: 'At least one field must be updated' });
}

let sql = 'UPDATE users SET';
const values = [];

if (username) {
  sql += ' username = ?,';
  values.push(username);
}

if (email) {
  sql += ' email = ?,';
  values.push(email);
}

if (password) {
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    sql += ' password = ?,';
    values.push(hash);

    finishUpdate(sql, values, id, profilePicture, description, res);
  });

  return;
}

if (description) {
  sql += ' description = ?,';
  values.push(description);
}

finishUpdate(sql, values, id, profilePicture, description, res);
});
});

function finishUpdate(sql, values, id, profilePicture, description, res) {
if (profilePicture) {
sql += ' profilePicture = ?,';
values.push(profilePicture);
}

sql = sql.slice(0, -1);
sql += ' WHERE id = ?';
values.push(id);

db.run(sql, values, function (err) {
if (err) {
return res.status(500).json({ error: err.message });
}

const user = { id, profilePicture, description };

res.json({ user });
});
}



module.exports = app;