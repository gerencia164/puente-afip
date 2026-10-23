const express = require('express');
const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Inicializar la librería de AFIP
const afip = new Afip({
  CUIT: 20369081315, // Tu CUIT emisor
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

    // Instanciar el servicio del Padrón A13 antes de consultar
    const padron = afip.RegisterA13;
    const persona = await padron.getTaxpayerDetails(parseInt(cuit));

    let razonSocial = null;

    if (persona && persona.personaReturn && persona.personaReturn.persona) {
      const p = persona.personaReturn.persona;
      razonSocial = p.razonSocial || `${p.apellido || ''} ${p.nombre || ''}`.trim();
    } else if (persona && persona.datosGenerales) {
      razonSocial = persona.datosGenerales.razonSocial || `${persona.datosGenerales.apellido || ''} ${persona.datosGenerales.nombre || ''}`.trim();
    }

    if (razonSocial) {
      return res.json({ status: 'success', cuit, razonSocial });
    } else {
      return res.status(404).json({ status: 'error', message: 'No se encontraron datos' });
    }
  } catch (error) {
    console.error('Error al consultar AFIP:', error);
    return res.status(500).json({ status: 'error', message: error.message || error.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor puente escuchando en el puerto ${PORT}`);
});
