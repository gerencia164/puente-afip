const express = require('express');
const Afip = require('@afipsdk/afip.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Inicializar AFIP
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

    // Obtener la instancia correcta del padrón A13
    const padron = afip.use('RegisterA13') || afip.RegisterA13 || afip.registerA13;
    
    if (!padron) {
      throw new Error('No se pudo cargar el módulo RegisterA13 del SDK de AFIP');
    }

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
