// Barcode and QR Code scanning functionality

// Check if device has camera
function hasCamera() {
  return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
}

// Start camera for barcode scanning
async function startBarcodeScanner(videoElement, onScan) {
  if (!hasCamera()) {
    return { success: false, error: 'Camera not available on this device' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment' // Use back camera on mobile
      }
    });

    videoElement.srcObject = stream;
    videoElement.play();

    // Use jsQR library for QR code scanning
    // For production, you'd want to use a library like:
    // - jsQR (for QR codes)
    // - QuaggaJS or ZXing (for barcodes)
    // - @zxing/library (modern barcode scanner)

    return { success: true, stream };
  } catch (error) {
    console.error('Error accessing camera:', error);
    return { success: false, error: error.message || 'Failed to access camera' };
  }
}

// Stop camera stream
function stopBarcodeScanner(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

// Generate QR code for medicine
function generateQRCode(medicineId, medicineName, batch) {
  // Using QR code API (you can also use qrcode.js library)
  const data = JSON.stringify({
    id: medicineId,
    name: medicineName,
    batch: batch,
    type: 'medicine'
  });

  // URL encode the data
  const encodedData = encodeURIComponent(data);
  
  // Using a QR code API service (you can replace with a library)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
  
  return qrCodeUrl;
}

// Generate barcode (Code 128) for medicine
function generateBarcode(medicineId, batch) {
  // Using barcode API (you can also use jsbarcode library)
  const data = `${medicineId}-${batch}`;
  const encodedData = encodeURIComponent(data);
  
  // Using a barcode API service
  const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodedData}&code=Code128&translate-esc=on`;
  
  return barcodeUrl;
}

// Scan QR code from image file using jsQR
async function scanQRFromImage(file) {
  return new Promise((resolve, reject) => {
    if (typeof jsQR === 'undefined') {
      reject(new Error('jsQR library not loaded'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          try {
            const data = JSON.parse(code.data);
            resolve({ success: true, data: data });
          } catch (error) {
            // If not JSON, return as text
            resolve({ success: true, data: code.data });
          }
        } else {
          reject(new Error('No QR code found in image'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Setup barcode scanner using ZXing
function setupBarcodeScanner(videoElement, canvasElement, onScan) {
  if (typeof ZXing === 'undefined') {
    console.warn('ZXing library not loaded');
    return null;
  }

  const codeReader = new ZXing.BrowserMultiFormatReader();
  let scanning = false;

  return {
    start: async () => {
      if (!hasCamera()) {
        return { success: false, error: 'Camera not available' };
      }

      try {
        scanning = true;
        
        // Get available video input devices
        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        // Use back camera if available, otherwise first available
        let selectedDeviceId = null;
        if (videoInputDevices.length > 0) {
          const backCamera = videoInputDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear')
          );
          selectedDeviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        }

        // Start decoding from video
        codeReader.decodeFromVideoDevice(selectedDeviceId, videoElement, (result, err) => {
          if (result && scanning) {
            // Successfully scanned
            try {
              const data = JSON.parse(result.text);
              onScan(data);
            } catch (e) {
              // Not JSON, treat as text
              onScan(result.text);
            }
          }
          
          if (err && scanning) {
            // Error occurred, but continue scanning
            // Only log if it's not a "not found" error
            if (err.name !== 'NotFoundException') {
              console.error('Barcode scan error:', err);
            }
          }
        });

        return { success: true };
      } catch (error) {
        console.error('Error starting barcode scanner:', error);
        return { success: false, error: error.message };
      }
    },
    stop: () => {
      scanning = false;
      codeReader.reset();
      if (videoElement.srcObject) {
        stopBarcodeScanner(videoElement.srcObject);
      }
    }
  };
}

// Setup QR code scanner using jsQR
function setupQRScanner(videoElement, canvasElement, onScan) {
  if (typeof jsQR === 'undefined') {
    console.warn('jsQR library not loaded');
    return null;
  }

  let scanning = false;
  let animationFrame = null;

  const scan = () => {
    if (!scanning || !videoElement.videoWidth || !videoElement.videoHeight) {
      animationFrame = requestAnimationFrame(scan);
      return;
    }

    if (canvasElement) {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      const ctx = canvasElement.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      
      const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        try {
          const data = JSON.parse(code.data);
          onScan(data);
        } catch (e) {
          onScan(code.data);
        }
      }
    }

    animationFrame = requestAnimationFrame(scan);
  };

  return {
    start: async () => {
      if (!hasCamera()) {
        return { success: false, error: 'Camera not available' };
      }

      const result = await startBarcodeScanner(videoElement, null);
      if (result.success) {
        scanning = true;
        scan();
      }
      return result;
    },
    stop: () => {
      scanning = false;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (videoElement.srcObject) {
        stopBarcodeScanner(videoElement.srcObject);
      }
    }
  };
}

// Format medicine data for QR code
function formatMedicineForQR(medicine) {
  return {
    id: medicine.id,
    name: medicine.name,
    batch: medicine.batch,
    expiryDate: medicine.expiryDate ? new Date(medicine.expiryDate).toISOString() : null,
    type: 'medicine'
  };
}

// Parse QR code data
function parseQRCodeData(data) {
  try {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return data;
  } catch (error) {
    console.error('Error parsing QR code data:', error);
    return null;
  }
}

