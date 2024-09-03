const express = require("express");
const multer = require('multer');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, CopyObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer();

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: Number(process.env.PG_PORT),
});

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

function sanitizeFileName(fileName) {
    return fileName.replace(/\//g, '_');
}

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id';
        const values = [username, email, hashedPassword];
        const result = await pool.query(query, values);

        const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        try {
            const params = {
                Bucket: 'ergon-bucket',
                Key: `users/${username}/`
            }
            const command = new PutObjectCommand(params);
            const data = await s3Client.send(command);
        } catch (err) {
            console.error("Error", err);
            res.status(500).send('Error uploading to S3');
          }

        res.status(201).json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get("/user/name", authenticateToken, async (req, res) => {
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0].username;

    res.send(username);
});

app.get("/user/directory", authenticateToken, async (req, res) => {
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0].username;
    
    const params = {
        Bucket: 'ergon-bucket',
        Prefix: `users/${username}/`
    };

    try {
        const command = new ListObjectsV2Command(params);
        const data = await s3Client.send(command);

        if (!data.Contents) {
            console.log('No directories found for user:', username);
            return res.json([]);
        }

        const cleanedData = data.Contents.filter(file => {
            const cleanedKey = file.Key.replace(/\/+/g, '/');  // Replace multiple slashes with a single slash
            const splitKey = file.Key.split('/')
            return cleanedKey !== 'users/' + username + '/' && splitKey[splitKey.length - 1] === '';
        });
          

        const files = cleanedData.map(file => ({
            key: file.Key,
            size: file.Size,
            lastModified: file.LastModified,
            url: `https://${params.Bucket}.s3.amazonaws.com/${file.Key}`
        }));
        console.log(files);
        res.status(200).json(files);
    } catch (err) {
        console.error("Error", err);
        res.status(500).send('Error fetching files from S3');
    }
});

app.post("/user/directory", authenticateToken, async (req, res) => {
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0].username;
    const directoryName = sanitizeFileName(req.body.name);
    
    try {
        const params = {
            Bucket: 'ergon-bucket',
            Key: `users/${username}/${directoryName}/` 
        };
        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);
        res.status(200).send('Directory created successfully');
    } catch (err) {
        console.error("Error", err);
        res.status(500).send('Error creating directory in S3');
    }
});


app.delete("/user/directory", authenticateToken, async (req, res) => {
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0].username;
    const directoryName = req.body.name;
    
    try {
        const listParams = {
            Bucket: 'ergon-bucket',
            Prefix: `users/${username}/${directoryName}/`
        };
        const listCommand = new ListObjectsV2Command(listParams);
        const listedObjects = await s3Client.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return res.status(404).send('Directory not found or already empty');
        }

        const deleteObjects = listedObjects.Contents.map(({ Key }) => ({ Key }));

        const deleteParams = {
            Bucket: 'ergon-bucket',
            Delete: {
                Objects: deleteObjects
            }
        };
        const deleteCommand = new DeleteObjectsCommand(deleteParams);
        await s3Client.send(deleteCommand);

        res.status(200).send('Directory and its contents deleted successfully');
    } catch (err) {
        console.error("Error", err);
        res.status(500).send('Error deleting directory in S3');
    }
});


app.get("/user/:spaceName/files", authenticateToken, async (req, res) => {
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0].username;
    const directoryName = req.params.spaceName;
    
    const params = {
        Bucket: 'ergon-bucket',
        Prefix: `users/${username}/${directoryName}/`
    };

    try {
        const command = new ListObjectsV2Command(params);
        const data = await s3Client.send(command);

        if (!data.Contents) {
            console.log('No files found for user:', username);
            return res.json([]);
        }

        const cleanedData = data.Contents.filter(file => file.Key !== 'users/' + username + '/' + directoryName + '/')

        const files = cleanedData.map(file => ({
            key: file.Key,
            size: file.Size,
            lastModified: file.LastModified,
            url: `https://${params.Bucket}.s3.amazonaws.com/${file.Key}`
        }));
        res.status(200).json(files);
    } catch (err) {
        console.error("Error", err);
        res.status(500).send('Error fetching files from S3');
    }
});


app.delete("/user/:spaceName/file", authenticateToken, async (req, res) => { 
    const username = req.user.username;  // Assuming you have the username from the token
    const spaceName = req.params.spaceName;  // Assuming spaceName is passed from frontend
    const filesToDelete = req.body.files;

    try {
        const deleteObjects = filesToDelete.map(file => ({
            Key: `users/${username}/${spaceName}/${file.name}`  // Constructing the S3 key
        }));

        const params = {
            Bucket: 'ergon-bucket',
            Delete: {
                Objects: deleteObjects
            }
        };
        const command = new DeleteObjectsCommand(params);
        await s3Client.send(command);
        res.status(200).send('Files deleted successfully');
    } catch (err) {
        console.error("Error", err);
        res.status(500).send('Error deleting files from S3');
    }
});



app.post("/user/directory/rename", authenticateToken, async (req, res) => {
    console.log('Rename route accessed:', req.body); // Log request body
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0].username;
    const oldDirectoryName = req.body.oldName;
    const newDirectoryName = sanitizeFileName(req.body.newName);

    try {
        const listParams = {
            Bucket: 'ergon-bucket',
            Prefix: `users/${username}/${oldDirectoryName}`
        };
        const listCommand = new ListObjectsV2Command(listParams);
        const listedObjects = await s3Client.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return res.status(404).send('Directory not found or empty');
        }

        const copyPromises = listedObjects.Contents.map(({ Key }) => {
            const newKey = Key.replace(
                `users/${username}/${oldDirectoryName}/`,
                `users/${username}/${newDirectoryName}/`
            );

            return s3Client.send(
                new CopyObjectCommand({
                    Bucket: 'ergon-bucket',
                    CopySource: `ergon-bucket/${Key}`,
                    Key: newKey
                })
            );
        });

        await Promise.all(copyPromises);

        const deleteParams = {
            Bucket: 'ergon-bucket',
            Delete: {
                Objects: listedObjects.Contents.map(({ Key }) => ({ Key }))
            }
        };

        const deleteCommand = new DeleteObjectsCommand(deleteParams);
        await s3Client.send(deleteCommand);

        res.status(200).send('Directory renamed successfully');
    } catch (err) {
        console.error("Error", err);
        res.status(500).send('Error renaming directory in S3');
    }
});

app.post("/user/:spaceName/file/upload", authenticateToken, upload.single('file'), async (req, res) => {
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0].username;
    const directoryName = req.params.spaceName;
    const file = req.file;

    try {
        const params = {
            Bucket: 'ergon-bucket',
            Key: `users/${username}/${directoryName}/${sanitizeFileName(file.originalname)}`,
            Body: file.buffer,
            ContentType: file.mimetype
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        res.status(200).send('File uploaded successfully');
    } catch (err) {
        console.error("Error", err);
        res.status(500).send('Error uploading file to S3');
    }
});


app.post("/user/:spaceName/file/rename", authenticateToken, async (req, res) => {
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const username = userResult.rows[0].username;
    const directoryName = req.params.spaceName;
    const oldFileName = req.body.oldFileName;

    const fileExtension = oldFileName.substring(oldFileName.lastIndexOf('.'));
    
    const newFileName = sanitizeFileName(req.body.newFileName) + fileExtension;

    try {
        const oldKey = `users/${username}/${directoryName}/${oldFileName}`;
        const newKey = `users/${username}/${directoryName}/${newFileName}`;

        await s3Client.send(new CopyObjectCommand({
            Bucket: 'ergon-bucket',
            CopySource: `ergon-bucket/${oldKey}`,
            Key: newKey
        }));

        await s3Client.send(new DeleteObjectCommand({
            Bucket: 'ergon-bucket',
            Key: oldKey
        }));

        res.status(200).send('File renamed successfully');
    } catch (err) {
        console.error("Error", err);
        res.status(500).send('Error renaming file in S3');
    }
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        
        pool.query('SELECT username FROM users WHERE id = $1', [user.id], (error, results) => {
            if (error) {
                return res.sendStatus(500);
            }
            if (results.rows.length > 0) {
                req.user = { ...user, username: results.rows[0].username };
                next();
            } else {
                return res.sendStatus(404);
            }
        });
    });
}

const port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log(`listening on port ${port}`);
});