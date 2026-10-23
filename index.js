const express = require('express');
const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const CUIT_EMISOR = 20369081315;

// Inicialización de la librería
let afip = null;
try {
  afip = new Afip({
    CUIT: CUIT_EMISOR,
    cert: fs.readFileSync(path.join(__dirname, 'admglobal.CRT'), 'utf8'),
    key: fs.readFileSync(path.join(__dirname, 'admglobal.PEM'), 'utf8'),
    production: true
  });
} catch (e) {
  console.error("Error inicializando certificados de AFIP:", e);
}

app.post('/consultar-cuit', async (req, res) => {
  try {
    const { cuit } = req.body;
    if (!cuit) {
      return res.status(400).json({ status: 'error', message: 'CUIT no provisto' });
    }

    const cuitNum = parseInt(String(cuit).replace(/\D/g, ''));

    if (!afip) {
      return res.status(500).json({ status: 'error', message: 'Certificados AFIP no cargados' });
    }

    // Estrategia de consulta múltiple según versión instalada
    let persona = null;

    if (afip.RegisterA13 && typeof afip.RegisterA13.getTaxpayerDetails === 'function') {
      persona = await afip.RegisterA13.getTaxpayerDetails(cuitNum);
    } else if (afip.RegisterA10 && typeof afip.RegisterA10.getTaxpayerDetails === 'function') {
      persona = await afip.RegisterA10.getTaxpayerDetails(cuitNum);
    } else if (typeof afip.getTaxpayerDetails === 'function') {
      persona = await afip.getTaxpayerDetails(cuitNum);
    } else {
      // Método dinámico mediante la instancia genérica del SDK
      const padron = afip.use ? afip.use('ws_sr_padron_a13') : null;
      if (padron && typeof padron.getTaxpayerDetails === 'function') {
        persona = await padron.getTaxpayerDetails(cuitNum);
      } else {
        throw new Error("No se encontró una función válida para consultar el Padrón AFIP en la librería SDK");
      }
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
