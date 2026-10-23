const express = require('express');
const { Afip } = require('afip-apis');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Inicializar cliente AFIP
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

    // Consulta directa de padron A13
    const padron = afip.use('RegisterA13');
    const persona = await padron.getTaxpayerDetails(cuitNum);

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
      return res.status(404).json({ status: 'error', message: 'No se encontraron datos' });
    }
  } catch (error) {
    console.error('Error AFIP:', error);
    return res.status(500).json({ status: 'error', message: error.message || error.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
