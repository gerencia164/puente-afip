const express = require('express');
const Afip = require('@afipsdk/afip.js');
const fs = require('fs');

const app = express();
app.use(express.json());

// Instanciar AFIP con tus credenciales de ADM Global
const afip = new Afip({
  CUIT: 20369081315, // Tu CUIT emisor registrado en ARCA/AFIP
  cert: fs.readFileSync('./admglobal.crt', 'utf8'),
  key: fs.readFileSync('./admglobal.key', 'utf8'),
  production: true
});

app.post('/consultar-cuit', async (req, res) => {
  const { cuit } = req.body;
  
  if (!cuit) {
    return res.status(400).json({ status: 'error', message: 'CUIT no provisto' });
  }

  try {
    // Consulta directa al Padrón A13
    const persona = await afip.RegisterScope13.getTaxpayerDetails(cuit);
    
    let razonSocial = "CLIENTE DESCONOCIDO";
    if (persona && persona.datosGenerales) {
      if (persona.datosGenerales.razonSocial) {
        razonSocial = persona.datosGenerales.razonSocial;
      } else if (persona.datosGenerales.nombre && persona.datosGenerales.apellido) {
        razonSocial = `${persona.datosGenerales.apellido} ${persona.datosGenerales.nombre}`;
      }
    }

    return res.json({ status: 'success', cuit: cuit, razonSocial: razonSocial.toUpperCase() });

  } catch (error) {
    console.error("Error al consultar ARCA:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Puente AFIP activo en puerto ${PORT}`));