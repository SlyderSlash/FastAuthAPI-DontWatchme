const multer = require('multer');

// Configuration de l'upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads'); // Destination des fichiers uploadés
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9); // Nom unique du fichier
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]); // Nom complet du fichier (nom de champ - nom unique - extension)
  }
});

const upload = multer({ storage });

module.exports = upload;