// routes/importar.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const importarController = require("../controllers/importarController");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/preview", upload.single("archivo"), importarController.preview);
router.post("/confirmar", upload.single("archivo"), importarController.confirmar);

module.exports = router;