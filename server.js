const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Middleware
app.use(cors());
app.use(express.json());

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// AWS Configuration
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const bucketName = process.env.AWS_BUCKET_NAME;

// Upload multiple files
app.post('/upload', upload.array('files'), async (req, res) => {
    const files = req.files;
    if (!files.length) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
        const uploadResults = await Promise.all(files.map(file => {
            const params = {
                Bucket: bucketName,
                Key: file.originalname,
                Body: file.buffer,
                ACL: 'public-read'
            };
            return s3.upload(params).promise()
                .then(data => ({ fileName: file.originalname, success: true }))
                .catch(err => ({ fileName: file.originalname, success: false, error: err.message }));
        }));

        const successCount = uploadResults.filter(r => r.success).length;
        const errors = uploadResults.filter(r => !r.success).map(r => r.error);

        res.json({
            message: `Uploaded ${successCount} file(s) successfully.`,
            errors: errors.length ? errors : null
        });
    } catch (error) {
        res.status(500).json({ error: 'Server upload error' });
    }
});

// List files endpoint
app.get('/files', async (req, res) => {
    const params = { Bucket: bucketName };
    try {
        const data = await s3.listObjectsV2(params).promise();
        // Filter out directories (keys ending with '/')
        const files = (data.Contents || []).filter(item => !item.Key.endsWith('/'));
        res.json(files);
    } catch (error) {
        console.error('AWS Error:', error.message); // 🔍 Log the error
        res.status(500).json({ error: 'Error listing files: ' + error.message });
    }
});

// Delete file
app.post('/delete', async (req, res) => {
    const { filename } = req.body;
    const params = { Bucket: bucketName, Key: filename };
    try {
        await s3.deleteObject(params).promise();
        res.json({ message: `File ${filename} deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: `Error deleting file: ${error.message}` });
    }
});

// Generate download URL
app.post('/download', async (req, res) => {
    const { filename } = req.body;
    const params = {
        Bucket: bucketName,
        Key: filename,
        Expires: 60
    };
    try {
        const url = await s3.getSignedUrlPromise('getObject', params);
        res.json({ url, filename });
    } catch (error) {
        res.status(500).json({ error: `Error generating download URL: ${error.message}` });
    }
});

// Start server

// for local testing
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// for platform.sh deploy
// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//     console.log(`Server running on port ${port}`);
// });