const Jimp = require('jimp');

async function resize() {
  console.log("Reading image...");
  const image = await Jimp.read('/Users/daniatallah/Downloads/Amir-Projects/tri-pro/src/assets/tripro_w.png');
  
  console.log("Scaling image...");
  // Scale down the logo so it fits comfortably within the "safe zone" of the adaptive icon
  image.scaleToFit(650, 650);
  
  console.log("Creating transparent canvas...");
  // Create a new 1024x1024 image with completely transparent background
  const background = new Jimp(1024, 1024, 0x00000000); 
  
  // Calculate center position
  const x = Math.floor((1024 - image.bitmap.width) / 2);
  const y = Math.floor((1024 - image.bitmap.height) / 2);
  
  console.log("Compositing image...");
  background.composite(image, x, y);
  
  console.log("Writing files...");
  await background.writeAsync('/Users/daniatallah/Downloads/Amir-Projects/mobile_dev/assets/images/icon.png');
  await background.writeAsync('/Users/daniatallah/Downloads/Amir-Projects/mobile_dev/assets/images/android-icon-foreground.png');
  await background.writeAsync('/Users/daniatallah/Downloads/Amir-Projects/mobile_dev/assets/images/splash-icon.png');
  await background.writeAsync('/Users/daniatallah/Downloads/Amir-Projects/mobile_dev/assets/images/favicon.png');
  
  console.log("Done!");
}

resize().catch(console.error);
