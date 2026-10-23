const express = require('express');
const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Inicializar la librería de AFIP
const afip = new Afip({
  CUIT: 20369081315,
  cert: fs.readFileSync(path.join(__dirname, 'admglobal.CRT'), 'utf8'),
  key: fs.readFileSync(path.join(__dirname, 'admglobal.PEM'), 'utf8'),
  production: true
});

app.post('/consultar-cuit', async (req, res) => {
  try {
    const { cuit } = req.body;
    if (!cuit) {
      return res.status(400).json({ status: 'error', message: 'CUIT no provisto' });
    }

    const cuitNum = parseInt(String(cuit).replace(/\D/g, ''));

    // En @afipsdk/afip.js el servicio se accede instanciando RegisterA13 o RegisterA10
    let persona = null;

    try {
      persona = await afip.RegisterA13.getTaxpayerDetails(cuitNum);
    } catch (e1) {
      // Intento secundario por si el CUIT corresponde a Padron A10
      try {
        persona = await afip.RegisterA10.getTaxpayerDetails(cuitNum);
      } catch (e2) {
        throw new Error('Error al consultar Padrón AFIP/ARCA: ' + (e1.message || e1.toString()));
      }
    }

    let razonSocial = null;

    if (persona && persona.personaReturn && persona.personaReturn.persona) {
      const p = persona.personaReturn.persona;
      razonSocial = p.razonSocial || `${p.apellido || ''} ${p.nombre || ''}`.trim();
    } else if (persona && persona.datosGenerales) {
      const dg = persona.datosGenerales;
      razonSocial = dg.razonSocial || `${dg.apellido || ''} ${dg.nombre || ''}`.trim();
    }

    if (razonSocial) {
      return res.json({ status: 'success', cuit, razonSocial });
    } else {
      return res.status(404).json({ status: 'error', message: 'No se encontraron datos para el CUIT' });
    }
  } catch (error) {
    console.error('Error AFIP:', error);
    return res.status(500).json({ status: 'error', message: error.message || error.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor puente escuchando en puerto ${PORT}`);
});
