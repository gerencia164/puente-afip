const express = require('express');
const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Inicialización de la librería AFIP
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

    // Intentar obtener los datos del contribuyente usando las distintas variantes del SDK
    let persona = null;

    if (afip.RegisterA13) {
      persona = await afip.RegisterA13.getTaxpayerDetails(cuitNum);
    } else if (afip.RegisterA10) {
      persona = await afip.RegisterA10.getTaxpayerDetails(cuitNum);
    } else {
      // Método universal mediante la creación de la instancia del servicio
      const service = afip.use('ws_sr_padron_a13') || afip.use('RegisterA13');
      persona = await service.getTaxpayerDetails(cuitNum);
    }

    let razonSocial = null;

    if (persona) {
      if (persona.personaReturn && persona.personaReturn.persona) {
        const p = persona.personaReturn.persona;
        razonSocial = p.razonSocial || `${p.apellido || ''} ${p.nombre || ''}`.trim();
      } else if (persona.datosGenerales) {
        const dg = persona.datosGenerales;
        razonSocial = dg.razonSocial || `${dg.apellido || ''} ${dg.nombre || ''}`.trim();
      } else if (persona.razonSocial) {
        razonSocial = persona.razonSocial;
      }
    }

    if (razonSocial && razonSocial.length > 0) {
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
  console.log(`Servidor puente escuchando en puerto ${PORT}`);
});
