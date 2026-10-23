const express = require('express');
const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Inicialización del cliente de AFIP
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

    // Consulta nativa del SDK de AFIP para Padrón A13
    const persona = await afip.RegisterA13.getTaxpayerDetails(cuitNum);

    let razonSocial = null;

    if (persona) {
      if (persona.personaReturn && persona.personaReturn.persona) {
        const p = persona.personaReturn.persona;
        razonSocial = p.razonSocial || `${p.apellido || ''} ${p.nombre || ''}`.trim();
      } else if (persona.datosGenerales) {
        const dg = persona.datosGenerales;
        razonSocial = dg.razonSocial || `${dg.apellido || ''} ${dg.nombre || ''}`.trim();
      } else if (typeof persona === 'string') {
        razonSocial = persona;
      }
    }

    if (razonSocial && razonSocial.length > 0) {
      return res.json({ status: 'success', cuit, razonSocial });
    } else {
      return res.status(404).json({ 
        status: 'error', 
        message: 'No se encontraron datos de Razón Social para el CUIT',
        raw: persona 
      });
    }
  } catch (error) {
    console.error('Error al consultar AFIP:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || error.toString() 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor puente escuchando en puerto ${PORT}`);
});
