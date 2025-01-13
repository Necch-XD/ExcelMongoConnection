const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');

const ExcelDataSchema = new mongoose.Schema({
  name: String,
  number: String,
  email: String,
  phone: String,
});

const ExcelData = mongoose.model('ExcelData', ExcelDataSchema);

const app = express();
const port = 5000;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

mongoose.connect('mongodb://localhost:27017/NitinDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.log('Error connecting to MongoDB:', err);
});

app.post('/upload', upload.single('excelFile'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  const workbook = xlsx.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  for (const row of data) {
    try {
      const existingRecord = await ExcelData.findOne({
        name: row.name,
        number: row.number,
      });

      if (existingRecord) {
        existingRecord.email = row.email;
        existingRecord.phone = row.phone;
        await existingRecord.save();
        console.log(`Updated existing record for ${row.name}`);
      } else {
        const newRecord = new ExcelData(row);
        await newRecord.save();
        console.log(`Inserted new record for ${row.name}`);
      }
    } catch (err) {
      console.error('Error processing row:', err);
    }
  }

  res.status(200).send('File processed and data updated/inserted.');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
